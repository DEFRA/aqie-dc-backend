import crypto from 'crypto'

const generateSecureId = () => {
  return crypto
    .randomBytes(9)
    .toString('base64') // 12 chars but includes +=/
    .replace(/[^a-zA-Z0-9]/g, '') // remove symbols
    .slice(0, 12)
}

export async function createItem(db, type, item) {
  if (!db) throw new Error('db is required')
  if (!type) throw new Error('type is required')

  let collectionName
  if (type === 'appliance') {
    collectionName = 'Appliance'
  } else if (type === 'fuel') {
    collectionName = 'Fuel'
  } else {
    throw new Error(`Unknown type: ${type}`)
  }

  const collection = db.collection(collectionName)
  const now = new Date()
  const doc = {
    ...item,
    createdAt: item.createdAt || now,
    updatedAt: now
  }

  if (type === 'appliance') {
    doc.applianceId = doc.applianceId || `APP-${generateSecureId()}`
  } else {
    doc.fuelId = doc.fuelId || `FUEL-${generateSecureId()}`
  }

  const result = await collection.insertOne(doc)
  if (!result.acknowledged) {
    throw new Error('Failed to insert document')
  }

  // Ensure the returned doc includes the generated _id
  return { ...doc, _id: result.insertedId }
}
// Determine collection and id field
function getCollectionAndIdField(type, db) {
  let collectionName
  if (type === 'appliance') {
    collectionName = 'Appliance'
  } else if (type === 'fuel') {
    collectionName = 'Fuel'
  } else {
    throw new Error(`Unknown type: ${type}`)
  }
  const idField = type === 'appliance' ? 'applianceId' : 'fuelId'
  return { collection: db.collection(collectionName), idField }
}

const findCertified = (
  walesApproval,
  niApproval,
  scotApproval,
  engApproval
) => {
  const approvedRegions = []

  if (walesApproval === 'Certified') {
    approvedRegions.push('Wales')
  }
  if (niApproval === 'Certified') {
    approvedRegions.push('Northern Ireland')
  }
  if (scotApproval === 'Certified') {
    approvedRegions.push('Scotland')
  }
  if (engApproval === 'Certified') {
    approvedRegions.push('England')
  }

  return approvedRegions
}

export async function findAllItems(db, type) {
  const { collection } = getCollectionAndIdField(type, db)
  const data = (await collection.find({}).toArray()).filter(
    (a) =>
      a.technicalApproval === 'Certified' &&
      [
        a.walesApproval,
        a.nIrelandApproval,
        a.scotlandApproval,
        a.englandApproval
      ].includes('Certified')
  )
  if (type === 'appliance') {
    return data.map((a) => ({
      name: a.modelName || '',
      id: a.applianceId || '',
      manufacturer: a.companyName || '',
      fuels: Array.isArray(a.allowedFuels)
        ? a.allowedFuels.join(', ')
        : a.allowedFuels || '',
      type: a.applianceType,
      authorisedIn: findCertified(
        a.walesApproval,
        a.nIrelandApproval,
        a.scotlandApproval,
        a.englandApproval
      )
    }))
  } else {
    return data.map((a) => ({
      name: a.brandNames || '',
      id: a.fuelId,
      manufacturer: a.companyName || '',
      authorisedIn: findCertified(
        a.walesApproval,
        a.nIrelandApproval,
        a.scotlandApproval,
        a.englandApproval
      )
    }))
  }
}

export async function findItem(db, type, applicationId) {
  const { collection, idField } = getCollectionAndIdField(type, db)
  const data = await collection.findOne({[idField]: applicationId})
  
  if (!data) return null
  
  return {
    ...data,
    manufacturerName: data.companyName || '',
    manufacturerAddress: data.companyAddress || '',
    manufacturerContactName: data.companyContactName || '',
    manufacturerContactEmail: data.companyContactEmail || '',
    manufacturerAlternateEmail: data.companyAlternateEmail || '',
    manufacturerPhone: data.companyPhone || '',
    authorisedIn: findCertified(
      data.walesApproval,
      data.nIrelandApproval,
      data.scotlandApproval,
      data.englandApproval
    )
  }
}


export async function updateItem(db, type, applicationId, updates) {
  const { collection, idField } = getCollectionAndIdField(type, db)
  const now = new Date()
  const result = await collection.updateOne(
    { [idField]: applicationId },
    { $set: { ...updates, updatedAt: now } }
  )
  if (result.matchedCount === 0) return { notFound: true }
  const updated = await collection.findOne({ [idField]: applicationId })
  return { updated }
}

export async function deleteItem(db, type, applicationId) {
  const { collection, idField } = getCollectionAndIdField(type, db)
  const result = await collection.deleteOne({ [idField]: applicationId })
  if (result.deletedCount === 0) return { notFound: true }
  return { deleted: true }
}
