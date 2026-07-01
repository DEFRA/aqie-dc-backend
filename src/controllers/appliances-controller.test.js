import { beforeEach, describe, test, expect } from 'vitest'
import { createAppliance, getAllAppliances } from './appliances-controller.js'

// Mock logger for testing
const mockLogger = {
  info: () => {},
  error: () {}
}

// Mock/fake DB setup helpers would be needed for real tests

describe('appliances-controller', () => {
  let db
  let collection

  beforeEach(() => {
    // Simple in-memory mock for demonstration; replace with real DB mocks in production
    const docs = []
    collection = {
      insertOne: async (doc) => {
        docs.push(doc)
        return { insertedId: doc.applianceId || doc.fuelId || 'mock-id', acknowledged: true }
      },
      find: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              toArray: async () => docs
            })
          })
        }),
        toArray: async () => docs
      }),
      countDocuments: async () => docs.length
    }
    db = {
      collection: () => collection
    }
  })

  test('createAppliance inserts appliance and returns success', async () => {
    const result = await createAppliance(
      db,
      {
        companyName: 'ACME',
        technicalApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        scotlandApproval: 'Certified',
        englandApproval: 'Certified'
      },
      mockLogger
    )
    expect(result.success).toBe(true)
    expect(result.data.applianceId).toMatch(/^APP-/)
    expect(result.data.createdAt).toBeInstanceOf(Date)
    expect(result.data.updatedAt).toBeInstanceOf(Date)
  })

  test('getAllAppliances returns certified appliances with pagination', async () => {
    await createAppliance(
      db,
      {
        modelName: 'Certified Model',
        companyName: 'TestCorp',
        technicalApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        scotlandApproval: 'Certified',
        englandApproval: 'Certified'
      },
      mockLogger
    )
    await createAppliance(
      db,
      {
        modelName: 'Uncertified Model',
        companyName: 'TestCorp',
        technicalApproval: 'Uncertified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        scotlandApproval: 'Certified',
        englandApproval: 'Certified'
      },
      mockLogger
    )
    const result = await getAllAppliances(db, { page: 1, limit: 20 }, mockLogger)
    expect(result.success).toBe(true)
    expect(result.data.length).toBe(1)
    expect(result.data[0].name).toBe('Certified Model')
    expect(result.data[0].manufacturer).toBe('TestCorp')
    expect(result.pagination.total).toBe(1)
  })
})
