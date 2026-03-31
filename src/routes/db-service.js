import { generateSecureId, findCertified, findLastUpdatedDate, getFullAddress } from '../common/helpers/db-utils.js'

// --- Create ---
export async function createItem(db, type, item) {
  if (!db) {
    throw new Error('db is required')
  }
  if (!type) {
    throw new Error('type is required')
  }

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

// --- Read ---
export async function findAllItems(db, type) {
  const { collection } = getCollectionAndIdField(type, db)
  const items = (await collection.find({}).toArray()).filter(
    (item) =>
      item.technicalApproval === 'Certified' &&
      [
        item.walesApproval,
        item.nIrelandApproval,
        item.scotlandApproval,
        item.englandApproval
      ].includes('Certified')
  )
  if (type === 'appliance') {
    return items.map(mapApplianceItem)
  } else {
    return items.map(mapFuelItem)
  }
}

export async function findItem(db, type, applicationId) {
  const { collection, idField } = getCollectionAndIdField(type, db)
  const item = await collection.findOne({ [idField]: applicationId })
  if (!item) {
    return null
  }
  if (type === 'appliance') {
    return mapApplianceItem(item, true)
  } else {
    return mapFuelItem(item, true)
  }
}

// --- Mapping helpers ---
//Will be removed when frontend is updated to use the same field names as the database, but for now we need to support both formats. The detailed flag indicates whether to include all manufacturer details (for single item view) or just the name (for list view).
function mapApplianceItem(item, detailed = false) {
  if (detailed) {
    const {
      companyName,
      companyContactName,
      companyContactEmail,
      companyAlternateEmail,
      companyPhone,
      ...rest
    } = item
    const manufacturerFields = {
      manufacturerName: companyName || '',
      manufacturerContactName: companyContactName || '',
      manufacturerContactEmail: companyContactEmail || '',
      manufacturerAlternateEmail: companyAlternateEmail || '',
      manufacturerPhone: companyPhone || ''
    }
    return {
      ...rest,
      ...manufacturerFields,
      authorisedIn: findCertified(
        item.walesApproval,
        item.nIrelandApproval,
        item.scotlandApproval,
        item.englandApproval
      ),
      name: item.modelName || '',
      id: item.applianceId || '',
      fullAddress: getFullAddress(item)
    }
  } else {
    return {
      name: item.modelName || '',
      id: item.applianceId || '',
      manufacturer: item.companyName || '',
      fuels: Array.isArray(item.allowedFuels)
        ? item.allowedFuels.join(', ')
        : item.allowedFuels || '',
      type: item.applianceType,
      modelNumber: item.modelNumber,
      authorisedIn: findCertified(
        item.walesApproval,
        item.nIrelandApproval,
        item.scotlandApproval,
        item.englandApproval
      )
    }
  }
}

function mapFuelItem(item, detailed = false) {
  if (detailed) {
    const {
      companyName,
      companyContactName,
      companyContactEmail,
      companyAlternateEmail,
      companyPhone,
      ...rest
    } = item
    const manufacturerFields = {
      manufacturerName: companyName || '',
      manufacturerContactName: companyContactName || '',
      manufacturerContactEmail: companyContactEmail || '',
      manufacturerAlternateEmail: companyAlternateEmail || '',
      manufacturerPhone: companyPhone || ''
    }
    return {
      ...rest,
      ...manufacturerFields,
      authorisedIn: findCertified(
        item.walesApproval,
        item.nIrelandApproval,
        item.scotlandApproval,
        item.englandApproval
      ),
      lastUpdatedDate: findLastUpdatedDate(
        item.walesUpdatedDate,
        item.nIrelandUpdatedDate,
        item.scotlandUpdatedDate,
        item.englandUpdatedDate
      ),
      name: item.brandNames || '',
      id: item.fuelId,
      fullAddress: getFullAddress(item)
    }
  } else {
    return {
      name: item.brandNames || '',
      id: item.fuelId,
      manufacturer: item.companyName || '',
      authorisedIn: findCertified(
        item.walesApproval,
        item.nIrelandApproval,
        item.scotlandApproval,
        item.englandApproval
      ),
      lastUpdatedDate: findLastUpdatedDate(
        item.walesUpdatedDate,
        item.nIrelandUpdatedDate,
        item.scotlandUpdatedDate,
        item.englandUpdatedDate
      )
    }
  }
}

// --- Update ---
export async function updateItem(db, type, applicationId, updates) {
  const { collection, idField } = getCollectionAndIdField(type, db)
  const now = new Date()
  const result = await collection.updateOne(
    { [idField]: applicationId },
    { $set: { ...updates, updatedAt: now } }
  )
  if (result.matchedCount === 0) {
    return { notFound: true }
  }
  const updated = await collection.findOne({ [idField]: applicationId })
  return { updated }
}

// --- Delete ---
export async function deleteItem(db, type, applicationId) {
  const { collection, idField } = getCollectionAndIdField(type, db)
  const result = await collection.deleteOne({ [idField]: applicationId })
  if (result.deletedCount === 0) {
    return { notFound: true }
  }
  return { deleted: true }
}
