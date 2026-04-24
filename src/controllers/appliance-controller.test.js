import { beforeEach, describe, test, expect } from 'vitest'
import { createAppliance, findAllAppliance } from './appliance-controller.js'

// Mock/fake DB setup helpers would be needed for real tests

describe('appliance-controller', () => {
  let db
  let collection

  beforeEach(() => {
    // Simple in-memory mock for demonstration; replace with real DB mocks in production
    const docs = []
    collection = {
      insertOne: async (doc) => {
        docs.push(doc)
        return { insertedId: doc.applianceId || doc.fuelId || 'mock-id' }
      },
      find: () => ({
        toArray: async () => docs
      })
    }
    db = {
      collection: () => collection
    }
  })

  test('createAppliance inserts appliance and returns success', async () => {
    const result = await createAppliance(db, 'appliance', {
      companyName: 'ACME',
      technicalApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })
    expect(result.success).toBe(true)
    expect(result.data.applianceId).toMatch(/^APP-/)
    expect(result.data.createdAt).toBeInstanceOf(Date)
    expect(result.data.updatedAt).toBeInstanceOf(Date)
  })

  test('findAllAppliance returns certified appliances', async () => {
    await createAppliance(db, 'appliance', {
      modelName: 'Certified Model',
      companyName: 'TestCorp',
      technicalApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })
    await createAppliance(db, 'appliance', {
      modelName: 'Uncertified Model',
      companyName: 'TestCorp',
      technicalApproval: 'Uncertified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })
    const results = await findAllAppliance(db, 'appliance')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Certified Model')
    expect(results[0].manufacturer).toBe('TestCorp')
  })
})
