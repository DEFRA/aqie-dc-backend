import { APPLICATION_STATUS_COMPLETE } from '../common/helpers/review-status.js'

export async function getCompleteApplicationRecordsFilter(db) {
  // 1. Query only completed applications from the native MongoDB collection
  const completeApplicationIds = await db
    .collection('Applications')
    .find({ status: APPLICATION_STATUS_COMPLETE })
    .project({ id: 1, _id: 0 })
    .toArray()

  // 2. Extract the application IDs values and return them in a simple array
  const ids = completeApplicationIds.map((app) => app.id).filter(Boolean)

  // 3. Return a MongoDB query filter object, to be used to find e.g. all appliance records of complete applications
  return { applicationId: { $in: ids } }
}
