import crypto from 'node:crypto'

const RANDOM_BYTES_LENGTH = 9;
const SECURE_ID_LENGTH = 12;
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const generateSecureId = () => {
  return crypto
    .randomBytes(RANDOM_BYTES_LENGTH)
    .toString('base64') // 12 chars but includes +=/
    .replaceAll(NON_ALPHANUMERIC_REGEX, '') // remove symbols
    .slice(0, SECURE_ID_LENGTH);
}

export async function createItem(db, type, item) {
  if (!db) {
    throw new Error('db is required');
  }
  if (!type) {
    throw new Error('type is required');
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
    throw new Error('Failed to insert document');
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
    return items.map((item) => ({
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
    }))
  } else {
    return items.map((item) => ({
      name: item.brandNames || '',
      id: item.fuelId,
      manufacturer: item.companyName || '',
      authorisedIn: findCertified(
        item.walesApproval,
        item.nIrelandApproval,
        item.scotlandApproval,
        item.englandApproval
      )
    }))
  }
}

export async function findItem(db, type, applicationId) {
  const { collection, idField } = getCollectionAndIdField(type, db)
  const item = await collection.findOne({ [idField]: applicationId })

  if (!item) {
    return null
  }
  //NEEDTO: temporary until doing full DB changes
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

  if (type === 'appliance') {
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
      id: item.applianceId || ''
    }
  } else {
    return {
      ...rest,
      ...manufacturerFields,
      authorisedIn: findCertified(
        item.walesApproval,
        item.nIrelandApproval,
        item.scotlandApproval,
        item.englandApproval
      ),
      name: item.brandNames || '',
      id: item.fuelId
    }
  }
}


export async function updateItem(db, type, applicationId, updates) {
  const { collection, idField } = getCollectionAndIdField(type, db);
  const now = new Date();
  const result = await collection.updateOne(
    { [idField]: applicationId },
    { $set: { ...updates, updatedAt: now } }
  );
  if (result.matchedCount === 0) {
    return { notFound: true };
  }
  const updated = await collection.findOne({ [idField]: applicationId });
  return { updated };
}


export async function deleteItem(db, type, applicationId) {
  const { collection, idField } = getCollectionAndIdField(type, db);
  const result = await collection.deleteOne({ [idField]: applicationId });
  if (result.deletedCount === 0) {
    return { notFound: true };
  }
  return { deleted: true };
}
