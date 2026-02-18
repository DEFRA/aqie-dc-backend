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

const findAuthorisedIn = (
  walesApproval,
  irApproval,
  scotApproval,
  engApproval
) => {
  const approvedRegions = []

  if (walesApproval === 'Approved') {
    approvedRegions.push('Wales')
  }
  if (irApproval === 'Approved') {
    approvedRegions.push('Northern Ireland')
  }
  if (scotApproval === 'Approved') {
    approvedRegions.push('Scotland')
  }
  if (engApproval === 'Approved') {
    approvedRegions.push('England')
  }

  return approvedRegions
}

export async function findAllItems(db, type) {
  const { collection } = getCollectionAndIdField(type, db)
  const data = (await collection.find({}).toArray()).filter(
    (a) =>
      a.technicalApproval === 'Approved' &&
      [
        a.walesApproval,
        a.nIrelandApproval,
        a.scotlandApproval,
        a.englandApproval
      ].includes('Approved')
  )
  if (type === 'appliance') {
    return data.map((a) => ({
      name: a.modelName || '',
      id: a.applianceId || '',
      manufacturer: a.manufacturerName || '',
      fuels: Array.isArray(a.allowedFuels)
        ? a.allowedFuels.join(', ')
        : a.allowedFuels || '',
      type: a.applianceType,
      authorisedIn: findAuthorisedIn(
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
      manufacturer: a.manufacturerName || '',
      authorisedIn: findAuthorisedIn(
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
  console.log('Finding item:', { type, applicationId })
  console.log('Using collection and idField:', {
    collection: collection.collectionName,
    idField
  })
  return collection.findOne({ [idField]: applicationId })
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
