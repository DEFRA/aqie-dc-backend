import { beforeEach, describe, test, expect, vi } from 'vitest'
import {
  createFuel,
  getAllFuels,
  getFuelById,
  updateFuel,
  deleteFuel,
  searchFuels
} from './fuels-controller.js'
import fuelExample from '../sample-data/fuel-example.js'

// Mock logger for testing
const mockLogger = {
  info: vi.fn(),
  error: vi.fn()
}

describe('fuels-controller', () => {
  let db
  let collection
  let docs

  beforeEach(() => {
    vi.clearAllMocks()

    docs = []
    collection = {
      insertOne: vi.fn(async (doc) => {
        docs.push(doc)
        return {
          insertedId: doc.fuelId || 'mock-id',
          acknowledged: true
        }
      }),
      find: vi.fn((query) => {
        const filterDocs = (docsToFilter) => {
          if (!query) return docsToFilter
          return docsToFilter.filter((doc) => {
            if (query.technicalApproval && doc.technicalApproval !== query.technicalApproval) {
              return false
            }
            if (query.$or) {
              return query.$or.some((condition) => {
                const field = Object.keys(condition)[0]
                if (condition[field]?.$regex) {
                  const regex = new RegExp(condition[field].$regex, condition[field].$options || '')
                  return regex.test(doc[field])
                }
                return doc[field] === condition[field]
              })
            }
            return true
          })
        }
        return {
          sort: vi.fn((sort) => ({
            skip: vi.fn((skip) => ({
              limit: vi.fn((limit) => ({
                toArray: vi.fn(async () => filterDocs(docs))
              }))
            })),
            toArray: vi.fn(async () => filterDocs(docs))
          })),
          skip: vi.fn((skip) => ({
            limit: vi.fn((limit) => ({
              toArray: vi.fn(async () => filterDocs(docs))
            }))
          })),
          toArray: vi.fn(async () => filterDocs(docs))
        }
      }),
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
          if (query.technicalApproval && doc.technicalApproval !== query.technicalApproval) {
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

  describe('createFuel', () => {
    test('inserts fuel and returns success with generated ID', async () => {
      const payload = {
        companyName: 'FuelCorp',
        brandNames: 'FuelBrand',
        technicalApproval: 'Certified',
        englandApproval: 'Certified'
      }

      const result = await createFuel(db, payload, mockLogger)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Fuel created successfully')
      expect(result.data.fuelId).toMatch(/^FUEL-/)
      expect(result.data.createdAt).toBeInstanceOf(Date)
      expect(result.data.updatedAt).toBeInstanceOf(Date)
      expect(collection.insertOne).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Fuel created'))
    })

    test('uses provided fuelId if supplied', async () => {
      const payload = {
        fuelId: 'FUEL-CUSTOM-123',
        companyName: 'FuelCorp',
        technicalApproval: 'Certified'
      }

      const result = await createFuel(db, payload, mockLogger)

      expect(result.data.fuelId).toBe('FUEL-CUSTOM-123')
    })

    test('throws error when db is missing', async () => {
      await expect(createFuel(null, fuelExample, mockLogger)).rejects.toThrow('db is required')
    })

    test('throws error when item is missing', async () => {
      await expect(createFuel(db, null, mockLogger)).rejects.toThrow('item is required')
    })

    test('throws error when logger is missing', async () => {
      await expect(createFuel(db, fuelExample, null)).rejects.toThrow('logger is required')
    })

    test('throws error when insertOne fails', async () => {
      collection.insertOne = vi.fn().mockRejectedValueOnce(new Error('DB error'))

      await expect(createFuel(db, fuelExample, mockLogger)).rejects.toThrow('DB error')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('throws error when result is not acknowledged', async () => {
      collection.insertOne = vi.fn(async () => ({ acknowledged: false }))

      await expect(createFuel(db, fuelExample, mockLogger)).rejects.toThrow('Failed to insert fuel')
    })
  })

  describe('getAllFuels', () => {
    test('returns all certified fuels', async () => {
      const certifiedFuel = {
        ...fuelExample,
        fuelId: 'FUEL-001',
        brandNames: 'Certified Brand',
        technicalApproval: 'Certified',
        englandApproval: 'Certified'
      }

      docs.push(certifiedFuel)

      const result = await getAllFuels(db, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Certified Brand')
      expect(result.data[0].id).toBe('FUEL-001')
    })

    test('filters out uncertified fuels', async () => {
      const certified = {
        ...fuelExample,
        fuelId: 'FUEL-001',
        brandNames: 'Certified',
        technicalApproval: 'Certified',
        englandApproval: 'Certified'
      }
      const uncertified = {
        ...fuelExample,
        fuelId: 'FUEL-002',
        brandNames: 'Uncertified',
        technicalApproval: 'Uncertified',
        englandApproval: 'Certified'
      }

      docs.push(certified, uncertified)

      const result = await getAllFuels(db, mockLogger)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Certified')
    })

    test('returns empty array when no certified fuels exist', async () => {
      const result = await getAllFuels(db, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    test('maps fuel summary correctly', async () => {
      const fuel = {
        ...fuelExample,
        fuelId: 'FUEL-001',
        brandNames: 'Premium Pellets',
        companyName: 'PelletCorp',
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Uncertified',
        nIrelandApproval: 'Uncertified'
      }

      docs.push(fuel)

      const result = await getAllFuels(db, mockLogger)
      const summary = result.data[0]

      expect(summary.name).toBe('Premium Pellets')
      expect(summary.manufacturer).toBe('PelletCorp')
      expect(summary.id).toBe('FUEL-001')
      expect(summary.authorisedIn).toContain('England')
      expect(summary.authorisedIn).toContain('Scotland')
    })

    test('throws error when logger is missing', async () => {
      await expect(getAllFuels(db, null)).rejects.toThrow('logger is required')
    })

    test('throws error on database failure', async () => {
      collection.find = vi.fn().mockReturnValue({
        toArray: vi.fn().mockRejectedValueOnce(new Error('DB error'))
      })

      await expect(getAllFuels(db, mockLogger)).rejects.toThrow('DB error')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('getFuelById', () => {
    test('returns fuel detail when found', async () => {
      const fuel = {
        ...fuelExample,
        fuelId: 'FUEL-001',
        brandNames: 'Brand X',
        companyName: 'FuelCo',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Uncertified',
        nIrelandApproval: 'Uncertified'
      }

      docs.push(fuel)

      const result = await getFuelById(db, 'FUEL-001', mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.id).toBe('FUEL-001')
      expect(result.data.name).toBe('Brand X')
      expect(result.data.manufacturer).toBe('FuelCo')
      expect(result.data.authorisedIn).toContain('England')
    })

    test('includes fullAddress in detail', async () => {
      const fuel = {
        ...fuelExample,
        fuelId: 'FUEL-001',
        isUkBased: true,
        companyAddressLine1: '789 Industrial Est',
        companyAddressCity: 'Manchester',
        englandApproval: 'Certified'
      }

      docs.push(fuel)

      const result = await getFuelById(db, 'FUEL-001', mockLogger)

      expect(result.data.fullAddress).toBeDefined()
    })

    test('returns notFound when fuel does not exist', async () => {
      const result = await getFuelById(db, 'FUEL-NONEXISTENT', mockLogger)

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Fuel not found')
    })

    test('throws error when logger is missing', async () => {
      await expect(getFuelById(db, 'FUEL-001', null)).rejects.toThrow('logger is required')
    })

    test('throws error on database failure', async () => {
      collection.findOne = vi.fn().mockRejectedValueOnce(new Error('DB error'))

      await expect(getFuelById(db, 'FUEL-001', mockLogger)).rejects.toThrow('DB error')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('updateFuel', () => {
    test('updates fuel and returns updated document', async () => {
      const fuel = {
        ...fuelExample,
        fuelId: 'FUEL-001',
        brandNames: 'Original Brand'
      }
      docs.push(fuel)

      const updates = { brandNames: 'Updated Brand' }
      const result = await updateFuel(db, 'FUEL-001', updates, mockLogger)

      expect(result.updated).toBeDefined()
      expect(result.updated.brandNames).toBe('Updated Brand')
    })

    test('sets updatedAt timestamp', async () => {
      const fuel = {
        ...fuelExample,
        fuelId: 'FUEL-001',
        updatedAt: new Date('2020-01-01')
      }
      docs.push(fuel)

      const updates = { brandNames: 'Updated' }
      const result = await updateFuel(db, 'FUEL-001', updates, mockLogger)

      expect(result.updated.updatedAt).toBeInstanceOf(Date)
      expect(result.updated.updatedAt.getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime()
      )
    })

    test('returns notFound when fuel does not exist', async () => {
      const result = await updateFuel(db, 'FUEL-NONEXISTENT', { brandNames: 'Test' }, mockLogger)

      expect(result.notFound).toBe(true)
    })

    test('throws error when logger is missing', async () => {
      await expect(updateFuel(db, 'FUEL-001', {}, null)).rejects.toThrow('logger is required')
    })

    test('throws error on database failure', async () => {
      collection.updateOne = vi.fn().mockRejectedValueOnce(new Error('DB error'))

      await expect(updateFuel(db, 'FUEL-001', {}, mockLogger)).rejects.toThrow('DB error')
    })
  })

  describe('deleteFuel', () => {
    test('deletes fuel and returns deleted flag', async () => {
      const fuel = {
        ...fuelExample,
        fuelId: 'FUEL-001'
      }
      docs.push(fuel)

      const result = await deleteFuel(db, 'FUEL-001', mockLogger)

      expect(result.deleted).toBe(true)
    })

    test('returns notFound when fuel does not exist', async () => {
      const result = await deleteFuel(db, 'FUEL-NONEXISTENT', mockLogger)

      expect(result.notFound).toBe(true)
    })

    test('actually removes fuel from collection', async () => {
      const fuel = {
        ...fuelExample,
        fuelId: 'FUEL-001'
      }
      docs.push(fuel)

      await deleteFuel(db, 'FUEL-001', mockLogger)

      const found = docs.find((d) => d.fuelId === 'FUEL-001')
      expect(found).toBeUndefined()
    })

    test('throws error when logger is missing', async () => {
      await expect(deleteFuel(db, 'FUEL-001', null)).rejects.toThrow('logger is required')
    })

    test('throws error on database failure', async () => {
      collection.deleteOne = vi.fn().mockRejectedValueOnce(new Error('DB error'))

      await expect(deleteFuel(db, 'FUEL-001', mockLogger)).rejects.toThrow('DB error')
    })
  })

  describe('searchFuels', () => {
    test('searches by brandNames case-insensitive', async () => {
      const fuel1 = {
        ...fuelExample,
        fuelId: 'FUEL-001',
        brandNames: 'Premium Pellets'
      }
      const fuel2 = {
        ...fuelExample,
        fuelId: 'FUEL-002',
        brandNames: 'Standard Logs'
      }
      docs.push(fuel1, fuel2)

      const result = await searchFuels(
        db,
        { query: 'premium', page: 1, limit: 20 },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    test('returns pagination structure with page, limit, total, totalPages', async () => {
      docs.push({
        ...fuelExample,
        fuelId: 'FUEL-001',
        brandNames: 'Brand X'
      })

      const result = await searchFuels(
        db,
        { query: 'Brand', page: 1, limit: 20 },
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
        ...fuelExample,
        fuelId: 'FUEL-001',
        brandNames: 'XYZ Brand'
      })

      const result = await searchFuels(
        db,
        { query: 'nonexistent', page: 1, limit: 20 },
        mockLogger
      )

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })

    test('uses default pagination when not provided', async () => {
      const result = await searchFuels(db, { query: 'test' }, mockLogger)

      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
    })

    test('throws error when logger is missing', async () => {
      await expect(
        searchFuels(db, { query: 'test' }, null)
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
        searchFuels(db, { query: 'test' }, mockLogger)
      ).rejects.toThrow('DB error')
    })
  })
})
