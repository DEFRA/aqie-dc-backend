//Helper function to get a filter for complete application records - where should it go?
export async function getCompleteApplicationRecordsFilter(db) {
  // 1. Query only completed applications from the native MongoDB collection
  const completeApplicationIds = await db
    .collection('Applications')
    .find({ status: 'complete' })
    .project({ applicationId: 1, _id: 0 })
    .toArray()

  // 2. Extract the applicationId values and return them in a simple array
  const ids = completeApplicationIds
    .map((app) => app.applicationId)
    .filter(Boolean)

  // 3. Return a MongoDB query filter object, to be used to find e.g. all appliance records of complete applications
  return { applicationId: { $in: ids } }
}
