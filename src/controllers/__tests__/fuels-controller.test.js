import { describe, test, expect, beforeEach, vi } from 'vitest'

import {
  createFuel,
  getAllFuels,
  getFuelById,
  updateFuel,
  deleteFuel,
  getAllFuelsWithPagination,
  searchFuels,
  getFuelWithRelatedItems
} from '../fuels-controller.js'

import {
  generateSecureId,
  findCertified,
  findLastUpdatedDate,
  getFullAddress
} from '../../common/helpers/data-transformer.js'

vi.mock('../common/helpers/data-transformer.js', () => ({
  generateSecureId: vi.fn(),
  findCertified: vi.fn(),
  findLastUpdatedDate: vi.fn(),
  getFullAddress: vi.fn()
}))

describe('fuels-controller', () => {
  let db
  let collection
  let mockLogger

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }

    collection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      find: vi.fn()
    }

    db = {
      collection: vi.fn().mockReturnValue(collection)
    }

    generateSecureId.mockReturnValue('12345')
    findCertified.mockReturnValue('England')
    findLastUpdatedDate.mockReturnValue('2024-01-01')
    getFullAddress.mockReturnValue('1 Test Street')
  })

  describe('createFuel', () => {
    test('creates fuel successfully', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: 'mongo-id'
      })

      const result = await createFuel(
        db,
        { brandNames: 'Premium Fuel' },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result._id).toBe('mongo-id')
      expect(result.data.fuelId).toBe('FUEL-12345')
      expect(mockLogger.info).toHaveBeenCalled()
    })

    test('uses supplied fuelId', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: 'mongo-id'
      })

      const result = await createFuel(db, { fuelId: 'FUEL-001' }, mockLogger)

      expect(result.data.fuelId).toBe('FUEL-001')
      expect(generateSecureId).not.toHaveBeenCalled()
    })

    test('throws when db missing', async () => {
      await expect(createFuel(null, {}, mockLogger)).rejects.toThrow(
        'db is required'
      )
    })

    test('throws when item missing', async () => {
      await expect(createFuel(db, null, mockLogger)).rejects.toThrow(
        'item is required'
      )
    })

    test('throws when logger missing', async () => {
      await expect(createFuel(db, {})).rejects.toThrow('logger is required')
    })

    test('throws when insert not acknowledged', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: false
      })

      await expect(createFuel(db, {}, mockLogger)).rejects.toThrow(
        'Failed to insert fuel'
      )
    })

    test('handles database errors', async () => {
      collection.insertOne.mockRejectedValue(new Error('insert failed'))

      await expect(createFuel(db, {}, mockLogger)).rejects.toThrow(
        'insert failed'
      )

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('persists generated fuel id to database', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: 'mongo-id'
      })

      await createFuel(db, { brandNames: 'Premium Fuel' }, mockLogger)

      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          fuelId: 'FUEL-12345'
        })
      )
    })
  })

  describe('getAllFuels', () => {
    test('returns fuel summaries', async () => {
      const cursor = {
        toArray: vi.fn().mockResolvedValue([
          {
            fuelId: 'FUEL-001',
            brandNames: 'Premium Fuel',
            companyName: 'Fuel Company',
            englandCertification: {},
            scotlandCertification: {},
            walesCertification: {},
            nIrelandCertification: {}
          }
        ])
      }

      collection.find.mockReturnValue(cursor)

      const result = await getAllFuels(db, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Premium Fuel')
      expect(result.data[0].id).toBe('FUEL-001')
    })

    test('uses certification filter', async () => {
      collection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      })

      await getAllFuels(db, mockLogger)

      expect(collection.find).toHaveBeenCalledWith({
        'technicalReview.status': 'accepted',
        $or: [
          { 'englandCertification.status': 'certified' },
          { 'scotlandCertification.status': 'certified' },
          { 'walesCertification.status': 'certified' },
          { 'nIrelandCertification.status': 'certified' }
        ]
      })
    })

    test('throws when logger missing', async () => {
      await expect(getAllFuels(db)).rejects.toThrow('logger is required')
    })

    test('handles database errors', async () => {
      collection.find.mockImplementation(() => {
        throw new Error('query failed')
      })

      await expect(getAllFuels(db, mockLogger)).rejects.toThrow('query failed')

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('getFuelById', () => {
    test('returns mapped fuel detail', async () => {
      collection.findOne.mockResolvedValue({
        fuelId: 'FUEL-001',
        brandNames: 'Premium Fuel',
        companyName: 'Fuel Company',
        englandCertification: {
          lastCertifiedAt: '2024-01-01'
        },
        scotlandCertification: {
          lastCertifiedAt: '2024-01-01'
        },
        walesCertification: {
          lastCertifiedAt: '2024-01-01'
        },
        nIrelandCertification: {
          lastCertifiedAt: '2024-01-01'
        }
      })

      const result = await getFuelById(db, 'FUEL-001', mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.authorisedIn).toBe('England')
      expect(result.data.lastUpdatedDate).toBe('2024-01-01')
      expect(result.data.fullAddress).toBe('1 Test Street')
    })

    test('returns not found', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await getFuelById(db, 'missing', mockLogger)

      expect(result.notFound).toBe(true)
    })

    test('handles errors', async () => {
      collection.findOne.mockRejectedValue(new Error('lookup failed'))

      await expect(getFuelById(db, 'FUEL-001', mockLogger)).rejects.toThrow(
        'lookup failed'
      )
    })
  })

  describe('updateFuel', () => {
    test('updates fuel successfully', async () => {
      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })

      collection.findOne.mockResolvedValue({
        fuelId: 'FUEL-001',
        brandNames: 'Updated Fuel'
      })

      const result = await updateFuel(
        db,
        'FUEL-001',
        { brandNames: 'Updated Fuel' },
        mockLogger
      )

      expect(result.updated.brandNames).toBe('Updated Fuel')
    })

    test('returns notFound when no match', async () => {
      collection.updateOne.mockResolvedValue({
        matchedCount: 0
      })

      const result = await updateFuel(db, 'FUEL-001', {}, mockLogger)

      expect(result.notFound).toBe(true)
    })

    test('handles update errors', async () => {
      collection.updateOne.mockRejectedValue(new Error('update failed'))

      await expect(updateFuel(db, 'FUEL-001', {}, mockLogger)).rejects.toThrow(
        'update failed'
      )
    })
  })

  describe('deleteFuel', () => {
    test('deletes fuel', async () => {
      collection.deleteOne.mockResolvedValue({
        deletedCount: 1
      })

      const result = await deleteFuel(db, 'FUEL-001', mockLogger)

      expect(result.deleted).toBe(true)
    })

    test('returns notFound', async () => {
      collection.deleteOne.mockResolvedValue({
        deletedCount: 0
      })

      const result = await deleteFuel(db, 'FUEL-001', mockLogger)

      expect(result.notFound).toBe(true)
    })

    test('handles delete errors', async () => {
      collection.deleteOne.mockRejectedValue(new Error('delete failed'))

      await expect(deleteFuel(db, 'FUEL-001', mockLogger)).rejects.toThrow(
        'delete failed'
      )
    })
  })

  describe('getAllFuelsWithPagination', () => {
    test('returns paginated results', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            fuelId: 'FUEL-001',
            brandNames: 'Fuel A',
            englandCertification: {
              lastCertifiedAt: '2024-01-01'
            },
            scotlandCertification: {
              lastCertifiedAt: '2024-01-01'
            },
            walesCertification: {
              lastCertifiedAt: '2024-01-01'
            },
            nIrelandCertification: {
              lastCertifiedAt: '2024-01-01'
            }
          }
        ])
      }

      collection.find.mockReturnValue(cursor)
      collection.countDocuments.mockResolvedValue(41)

      const result = await getAllFuelsWithPagination(
        db,
        { page: 2, limit: 20 },
        mockLogger
      )

      expect(result.pagination.total).toBe(41)
      expect(result.pagination.totalPages).toBe(3)
    })
  })

  describe('searchFuels', () => {
    test('returns search results', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            fuelId: 'FUEL-001',
            brandNames: 'Search Fuel',
            englandCertification: {
              lastCertifiedAt: '2024-01-01'
            },
            scotlandCertification: {
              lastCertifiedAt: '2024-01-01'
            },
            walesCertification: {
              lastCertifiedAt: '2024-01-01'
            },
            nIrelandCertification: {
              lastCertifiedAt: '2024-01-01'
            }
          }
        ])
      }

      collection.find.mockReturnValue(cursor)
      collection.countDocuments.mockResolvedValue(10)

      const result = await searchFuels(db, { query: 'fuel' }, mockLogger)

      expect(result.success).toBe(true)
      expect(result.pagination.total).toBe(10)
    })

    test('handles search errors', async () => {
      collection.find.mockImplementation(() => {
        throw new Error('search failed')
      })

      await expect(
        searchFuels(db, { query: 'fuel' }, mockLogger)
      ).rejects.toThrow('search failed')
    })
  })

  describe('getFuelWithRelatedItems', () => {
    test('returns fuel detail', async () => {
      collection.findOne.mockResolvedValue({
        fuelId: 'FUEL-001',
        brandNames: 'Related Fuel',
        englandCertification: {
          lastCertifiedAt: '2024-01-01'
        },
        scotlandCertification: {
          lastCertifiedAt: '2024-01-01'
        },
        walesCertification: {
          lastCertifiedAt: '2024-01-01'
        },
        nIrelandCertification: {
          lastCertifiedAt: '2024-01-01'
        }
      })

      const result = await getFuelWithRelatedItems(db, 'FUEL-001', mockLogger)

      expect(result.success).toBe(true)
    })

    test('returns not found', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await getFuelWithRelatedItems(db, 'missing', mockLogger)

      expect(result.notFound).toBe(true)
    })

    test('handles errors', async () => {
      collection.findOne.mockRejectedValue(new Error('fetch failed'))

      await expect(
        getFuelWithRelatedItems(db, 'FUEL-001', mockLogger)
      ).rejects.toThrow('fetch failed')
    })
  })

  describe('logger validation', () => {
    test.each([
      () => getFuelById(db, '1'),
      () => updateFuel(db, '1', {}),
      () => deleteFuel(db, '1'),
      () => getAllFuelsWithPagination(db),
      () => searchFuels(db, { query: 'a' }),
      () => getFuelWithRelatedItems(db, '1')
    ])('throws when logger missing', async (fn) => {
      await expect(fn()).rejects.toThrow('logger is required')
    })
  })
})
