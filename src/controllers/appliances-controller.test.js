import { beforeEach, describe, test, expect, vi } from 'vitest'
import {
  createAppliance,
  getAllAppliances,
  getApplianceById,
  updateAppliance,
  deleteAppliance,
  searchAppliances
} from './appliances-controller.js'
import applianceExample from '../sample-data/appliance-example.js'

// Mock logger for testing
const mockLogger = {
  info: vi.fn(),
  error: vi.fn()
}

describe('appliances-controller', () => {
  let db
  let collection
  let docs

  beforeEach(() => {
    // Reset logger mocks
    vi.clearAllMocks()

    // In-memory mock collection
    docs = []
    collection = {
      insertOne: vi.fn(async (doc) => {
        docs.push(doc)
        return {
          insertedId: doc.id || 'mock-id',
          acknowledged: true
        }
      }),
      find: vi.fn((query) => ({
        sort: vi.fn((sort) => ({
          skip: vi.fn((skip) => ({
            limit: vi.fn((limit) => ({
              toArray: vi.fn(async () => {
                // Simple filtering mock for find with $regex
                if (query?.$or) {
                  return docs.filter((doc) =>
                    query.$or.some((condition) => {
                      const field = Object.keys(condition)[0]
                      if (condition[field]?.$regex) {
                        const regex = new RegExp(
                          condition[field].$regex,
                          condition[field].$options || ''
                        )
                        return regex.test(doc[field])
                      }
                      return false
                    })
                  )
                }
                return docs
              })
            }))
          })),
          toArray: vi.fn(async () => {
            // Filter docs based on query
            if (!query) return docs
            return docs.filter((doc) => {
              // Handle technicalReview && $or filters
              if (
                query['technicalReview.status'] &&
                doc.technicalReview?.status !== query['technicalReview.status']
              ) {
                return false
              }
              if (query.$or) {
                return query.$or.some((condition) => {
                  const field = Object.keys(condition)[0]
                  return doc[field] === condition[field]
                })
              }
              return true
            })
          })
        }))
      })),
      findOne: vi.fn(async (query) => {
        return docs.find((doc) => {
          for (const key in query) {
            if (doc[key] !== query[key]) return false
          }
          return true
        })
      }),
      updateOne: vi.fn(async (query, update) => {
        const doc = docs.find((d) => {
          for (const key in query) {
            if (d[key] !== query[key]) return false
          }
          return true
        })
        if (doc) {
          Object.assign(doc, update.$set)
          return { matchedCount: 1, modifiedCount: 1 }
        }
        return { matchedCount: 0, modifiedCount: 0 }
      }),
      deleteOne: vi.fn(async (query) => {
        const index = docs.findIndex((d) => {
          for (const key in query) {
            if (d[key] !== query[key]) return false
          }
          return true
        })
        if (index >= 0) {
          docs.splice(index, 1)
          return { deletedCount: 1 }
        }
        return { deletedCount: 0 }
      }),
      countDocuments: vi.fn(async (query) => {
        if (!query) return docs.length
        return docs.filter((doc) => {
          // Basic query matching
          if (
            query['technicalReview.status'] &&
            doc.technicalReview?.status !== query['technicalReview.status']
          ) {
            return false
          }
          if (query.$or) {
            return query.$or.some((condition) => {
              const field = Object.keys(condition)[0]
              return doc[field] === condition[field]
            })
          }
          return true
        }).length
      })
    }

    db = {
      collection: vi.fn(() => collection)
    }
  })

  describe('createAppliance', () => {
    test('inserts appliance and returns success with generated ID', async () => {
      const payload = {
        companyName: 'ACME',
        modelName: 'Model X',
        'technicalReview.status': 'accepted',
        walesCertification: { status: 'certified' },
        nIrelandCertification: { status: 'certified' },
        scotlandCertification: { status: 'certified' },
        englandCertification: { status: 'certified' }
      }

      const result = await createAppliance(db, payload, mockLogger)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Appliance created successfully')
      expect(result.data.id).toMatch(/^APP-/)
      expect(result.data.createdAt).toBeInstanceOf(Date)
      expect(result.data.updatedAt).toBeInstanceOf(Date)
      expect(collection.insertOne).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Appliance created')
      )
    })

    test('uses provided id if supplied', async () => {
      const payload = {
        id: 'APP-CUSTOM-123',
        companyName: 'ACME',
        'technicalReview.status': 'accepted',
        englandCertification: { status: 'certified' }
      }

      const result = await createAppliance(db, payload, mockLogger)

      expect(result.data.id).toBe('APP-CUSTOM-123')
    })

    test('sets id to null if not provided', async () => {
      const result = await createAppliance(db, applianceExample, mockLogger)

      expect(result.data.id).toBeDefined()
    })

    test('preserves applicationId if provided', async () => {
      const payload = { ...applianceExample, applicationId: 'app-123' }

      const result = await createAppliance(db, payload, mockLogger)

      expect(result.data.applicationId).toBe('app-123')
    })

    test('throws error when db is missing', async () => {
      const payload = {
        companyName: 'ACME',
        'technicalReview.status': 'accepted'
      }

      await expect(createAppliance(null, payload, mockLogger)).rejects.toThrow(
        'db is required'
      )
    })

    test('throws error when item is missing', async () => {
      await expect(createAppliance(db, null, mockLogger)).rejects.toThrow(
        'item is required'
      )
    })

    test('throws error when logger is missing', async () => {
      const payload = {
        companyName: 'ACME',
        'technicalReview.status': 'accepted'
      }

      await expect(createAppliance(db, payload, null)).rejects.toThrow(
        'logger is required'
      )
    })

    test('throws error when insertOne fails', async () => {
      collection.insertOne = vi
        .fn()
        .mockRejectedValueOnce(new Error('DB error'))

      await expect(
        createAppliance(db, applianceExample, mockLogger)
      ).rejects.toThrow('DB error')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('throws error when result is not acknowledged', async () => {
      collection.insertOne = vi.fn(async () => ({ acknowledged: false }))

      await expect(
        createAppliance(db, applianceExample, mockLogger)
      ).rejects.toThrow('Failed to insert appliance')
    })
  })

  describe('getAllAppliances', () => {
    test('returns all certified appliances', async () => {
      const certifiedAppliance = {
        ...applianceExample,
        id: 'APP-001',
        modelName: 'Certified Model',
        technicalReview: { status: 'accepted' },
        englandCertification: { status: 'certified' }
      }

      docs.push(certifiedAppliance)

      const result = await getAllAppliances(db, {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Certified Model')
      expect(result.data[0].id).toBe('APP-001')
    })

    test('filters out uncertified appliances', async () => {
      const certified = {
        ...applianceExample,
        id: 'APP-001',
        modelName: 'Certified',
        technicalReview: { status: 'accepted' },
        englandCertification: { status: 'certified' }
      }
      const uncertified = {
        ...applianceExample,
        id: 'APP-002',
        modelName: 'Uncertified',
        technicalReview: { status: 'rejected' },
        englandCertification: { status: 'certified' }
      }

      docs.push(certified, uncertified)

      const result = await getAllAppliances(db, {}, mockLogger)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Certified')
    })

    test('returns empty array when no certified appliances exist', async () => {
      const result = await getAllAppliances(db, {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    test('maps appliance summary correctly', async () => {
      const appliance = {
        ...applianceExample,
        id: 'APP-001',
        modelName: 'Test Model',
        companyName: 'Test Corp',
        applianceType: 'boiler',
        modelNumber: 'TM-123',
        allowedFuels: ['Gas', 'Oil'],
        technicalReview: { status: 'accepted' },
        englandCertification: { status: 'certified' }
      }

      docs.push(appliance)

      const result = await getAllAppliances(db, {}, mockLogger)
      const summary = result.data[0]

      expect(summary.name).toBe('Test Model')
      expect(summary.manufacturer).toBe('Test Corp')
      expect(summary.type).toBe('boiler')
      expect(summary.modelNumber).toBe('TM-123')
      expect(summary.fuels).toBe('Gas, Oil')
    })

    test('handles fuels array properly', async () => {
      const appliance = {
        ...applianceExample,
        id: 'APP-001',
        allowedFuels: ['Wood Logs'],
        technicalReview: { status: 'accepted' },
        englandCertification: { status: 'certified' }
      }

      docs.push(appliance)

      const result = await getAllAppliances(db, {}, mockLogger)

      expect(result.data[0].fuels).toBe('Wood Logs')
    })

    test('throws error when logger is missing', async () => {
      await expect(getAllAppliances(db, {}, null)).rejects.toThrow(
        'logger is required'
      )
    })

    test('throws error on database failure', async () => {
      collection.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockRejectedValueOnce(new Error('DB error'))
        })
      })

      await expect(getAllAppliances(db, {}, mockLogger)).rejects.toThrow(
        'DB error'
      )
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('getApplianceById', () => {
    test('returns appliance detail when found', async () => {
      const appliance = {
        ...applianceExample,
        id: 'APP-001',
        modelName: 'Model X',
        companyName: 'ACME',
        englandCertification: { status: 'certified' },
        scotlandCertification: { status: 'certified' },
        walesCertification: { status: 'uncertified' },
        nIrelandCertification: { status: 'uncertified' }
      }

      docs.push(appliance)

      const result = await getApplianceById(db, 'APP-001', mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.id).toBe('APP-001')
      expect(result.data.name).toBe('Model X')
      expect(result.data.manufacturer).toBe('ACME')
      expect(result.data.authorisedIn).toContain('England')
      expect(result.data.authorisedIn).toContain('Scotland')
    })

    test('includes fullAddress in detail', async () => {
      const appliance = {
        ...applianceExample,
        id: 'APP-001',
        isUkBased: true,
        companyAddress: {
          line1: '123 Main St',
          city: 'London'
        },
        englandCertification: { status: 'certified' }
      }

      docs.push(appliance)

      const result = await getApplianceById(db, 'APP-001', mockLogger)

      expect(result.data.fullAddress).toBeDefined()
    })

    test('returns notFound when appliance does not exist', async () => {
      const result = await getApplianceById(db, 'APP-NONEXISTENT', mockLogger)

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Appliance not found')
    })

    test('throws error when logger is missing', async () => {
      await expect(getApplianceById(db, 'APP-001', null)).rejects.toThrow(
        'logger is required'
      )
    })

    test('throws error on database failure', async () => {
      collection.findOne = vi.fn().mockRejectedValueOnce(new Error('DB error'))

      await expect(getApplianceById(db, 'APP-001', mockLogger)).rejects.toThrow(
        'DB error'
      )
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('updateAppliance', () => {
    test('updates appliance and returns updated document', async () => {
      const appliance = {
        ...applianceExample,
        id: 'APP-001',
        modelName: 'Original Model'
      }
      docs.push(appliance)

      const updates = { modelName: 'Updated Model' }
      const result = await updateAppliance(db, 'APP-001', updates, mockLogger)

      expect(result.updated).toBeDefined()
      expect(result.updated.modelName).toBe('Updated Model')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Appliance updated')
      )
    })

    test('sets updatedAt timestamp', async () => {
      const appliance = {
        ...applianceExample,
        id: 'APP-001',
        updatedAt: new Date('2020-01-01')
      }
      docs.push(appliance)

      const updates = { modelName: 'Updated' }
      const result = await updateAppliance(db, 'APP-001', updates, mockLogger)

      expect(result.updated.updatedAt).toBeInstanceOf(Date)
      expect(result.updated.updatedAt.getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime()
      )
    })

    test('returns notFound when appliance does not exist', async () => {
      const result = await updateAppliance(
        db,
        'APP-NONEXISTENT',
        { modelName: 'Test' },
        mockLogger
      )

      expect(result.notFound).toBe(true)
    })

    test('throws error when logger is missing', async () => {
      await expect(updateAppliance(db, 'APP-001', {}, null)).rejects.toThrow(
        'logger is required'
      )
    })

    test('throws error on database failure', async () => {
      collection.updateOne = vi
        .fn()
        .mockRejectedValueOnce(new Error('DB error'))

      await expect(
        updateAppliance(db, 'APP-001', {}, mockLogger)
      ).rejects.toThrow('DB error')
    })
  })

  describe('deleteAppliance', () => {
    test('deletes appliance and returns deleted flag', async () => {
      const appliance = {
        ...applianceExample,
        id: 'APP-001'
      }
      docs.push(appliance)

      const result = await deleteAppliance(db, 'APP-001', mockLogger)

      expect(result.deleted).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Appliance deleted')
      )
    })

    test('returns notFound when appliance does not exist', async () => {
      const result = await deleteAppliance(db, 'APP-NONEXISTENT', mockLogger)

      expect(result.notFound).toBe(true)
    })

    test('actually removes appliance from collection', async () => {
      const appliance = {
        ...applianceExample,
        id: 'APP-001'
      }
      docs.push(appliance)

      await deleteAppliance(db, 'APP-001', mockLogger)

      const found = docs.find((d) => d.id === 'APP-001')
      expect(found).toBeUndefined()
    })

    test('throws error when logger is missing', async () => {
      await expect(deleteAppliance(db, 'APP-001', null)).rejects.toThrow(
        'logger is required'
      )
    })

    test('throws error on database failure', async () => {
      collection.deleteOne = vi
        .fn()
        .mockRejectedValueOnce(new Error('DB error'))

      await expect(deleteAppliance(db, 'APP-001', mockLogger)).rejects.toThrow(
        'DB error'
      )
    })
  })

  describe('searchAppliances', () => {
    test('searches by modelName case-insensitive', async () => {
      const appliance1 = {
        ...applianceExample,
        id: 'APP-001',
        modelName: 'Eco Boiler 2000'
      }
      const appliance2 = {
        ...applianceExample,
        id: 'APP-002',
        modelName: 'Standard Furnace'
      }
      docs.push(appliance1, appliance2)

      const result = await searchAppliances(
        db,
        { query: 'eco boiler', page: 1, limit: 20 },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    test('returns pagination structure with page, limit, total, totalPages', async () => {
      docs.push({
        ...applianceExample,
        id: 'APP-001',
        modelName: 'Model X'
      })

      const result = await searchAppliances(
        db,
        { query: 'Model', page: 1, limit: 20 },
        mockLogger
      )

      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
      expect(typeof result.pagination.total).toBe('number')
      expect(typeof result.pagination.totalPages).toBe('number')
    })

    test('returns empty array when no results match', async () => {
      docs.push({
        ...applianceExample,
        id: 'APP-001',
        modelName: 'XYZ Model'
      })

      const result = await searchAppliances(
        db,
        { query: 'nonexistent', page: 1, limit: 20 },
        mockLogger
      )

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })

    test('uses default pagination when not provided', async () => {
      const result = await searchAppliances(db, { query: 'test' }, mockLogger)

      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
    })

    test('throws error when logger is missing', async () => {
      await expect(
        searchAppliances(db, { query: 'test' }, null)
      ).rejects.toThrow('logger is required')
    })

    test('throws error on database failure', async () => {
      collection.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockRejectedValueOnce(new Error('DB error'))
            })
          })
        })
      })

      await expect(
        searchAppliances(db, { query: 'test' }, mockLogger)
      ).rejects.toThrow('DB error')
    })
  })
})
