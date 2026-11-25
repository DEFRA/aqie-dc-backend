import { describe, test, expect, beforeEach, vi } from 'vitest'

import {
  createFuel,
  getAllFuels,
  getFuelById,
  updateFuel,
  deleteFuel,
  getAllFuelsWithPagination,
  searchFuels,
  getFuelWithRelatedItems,
  getAdminFuelById
} from '#src/controllers/fuels-controller.js'

import {
  generateNextId,
  getFullAddress
} from '#src/common/helpers/data-transformer.js'
import {
  findCertified,
  findLastCertifiedDate
} from '#src/common/helpers/certification.js'

// generateNextId is non-deterministic (uses crypto), so it's mocked here.
// findCertified/getFullAddress run for real so tests exercise the actual
// mapping logic instead of asserting on fake data.
vi.mock('#src/common/helpers/data-transformer.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    generateNextId: vi.fn(),
    getFullAddress: vi.fn()
  }
})

vi.mock('#src/common/helpers/certification.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    findCertified: vi.fn(),
    findLastCertifiedDate: vi.fn()
  }
})

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

    generateNextId.mockReturnValue('8727-0001')
    findCertified.mockReturnValue('England')
    findLastCertifiedDate.mockReturnValue('2024-01-01')
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
        { brandName: 'Premium Fuel' },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result._id).toBe('mongo-id')
      expect(result.data.id).toBe('8727-0001')
      expect(mockLogger.info).toHaveBeenCalled()
    })

    test('uses supplied fuelId', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: 'mongo-id'
      })

      const result = await createFuel(db, { id: 'FUEL-001' }, mockLogger)

      expect(result.data.id).toBe('FUEL-001')
      expect(generateNextId).not.toHaveBeenCalled()
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

      await createFuel(db, { brandName: 'Premium Fuel' }, mockLogger)

      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '8727-0001'
        })
      )
    })
  })

  describe('getAllFuels', () => {
    test('returns fuel summaries', async () => {
      const cursor = {
        toArray: vi.fn().mockResolvedValue([
          {
            id: 'FUEL-001',
            brandName: 'Premium Fuel',
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

    test('only returns live fuels', async () => {
      collection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      })

      await getAllFuels(db, mockLogger)

      expect(collection.find).toHaveBeenCalledWith({
        fuelStatus: 'live'
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
        id: 'FUEL-001',
        brandName: 'Premium Fuel',
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
        id: 'FUEL-001',
        brandName: 'Updated Fuel'
      })

      const result = await updateFuel(
        db,
        'FUEL-001',
        { brandName: 'Updated Fuel' },
        mockLogger
      )

      expect(result.updated.brandName).toBe('Updated Fuel')
    })

    test.each([
      ['Brand Two', true],
      ['   ', false],
      [null, false]
    ])(
      'derives hasAdditionalBrandNames from additionalBrandNames %j',
      async (value, expected) => {
        collection.updateOne.mockResolvedValue({ matchedCount: 1 })
        collection.findOne.mockResolvedValue({ id: 'FUEL-001' })

        await updateFuel(
          db,
          'FUEL-001',
          { additionalBrandNames: value },
          mockLogger
        )

        expect(collection.updateOne).toHaveBeenCalledWith(
          { id: 'FUEL-001' },
          {
            $set: expect.objectContaining({
              additionalBrandNames: value,
              hasAdditionalBrandNames: expected
            })
          }
        )
      }
    )

    test('does not set hasAdditionalBrandNames when additionalBrandNames is absent', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({ id: 'FUEL-001' })

      await updateFuel(db, 'FUEL-001', { brandName: 'X' }, mockLogger)

      const { $set } = collection.updateOne.mock.calls[0][1]
      expect($set).not.toHaveProperty('hasAdditionalBrandNames')
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
            id: 'FUEL-001',
            brandName: 'Fuel A',
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
            id: 'FUEL-001',
            brandName: 'Search Fuel',
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
        id: 'FUEL-001',
        brandName: 'Related Fuel',
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

  describe('getAdminFuelById', () => {
    const certified = (firstCertifiedAt) => ({
      status: 'certified',
      firstCertifiedAt,
      lastCertifiedAt: '2026-03-01'
    })

    beforeEach(() => {
      mockLogger.warn = vi.fn()
    })

    test('returns the normalised admin fields for a live Manufacture fuel', async () => {
      findCertified.mockReturnValueOnce(['England', 'Wales'])
      collection.findOne.mockResolvedValue({
        id: '7756-0001',
        brandName: 'Cosytherm Briquettes',
        applicationId: '1234-0307',
        supplierType: 'Manufacture',
        isVisibleToPublic: true,
        fuelStatus: 'live',
        technicalReview: { status: 'accepted' },
        englandCertification: certified('2025-05-10'),
        scotlandCertification: { status: 'uncertified' },
        walesCertification: certified('2025-05-25'),
        nIrelandCertification: { status: 'awaiting_decision' }
      })

      const result = await getAdminFuelById(db, '7756-0001', mockLogger)

      expect(db.collection).toHaveBeenCalledWith('Fuels')
      expect(result).toEqual({
        success: true,
        data: {
          id: '7756-0001',
          name: 'Cosytherm Briquettes',
          applicationId: '1234-0307',
          supplierType: 'Manufacture',
          status: 'live',
          certifications: {
            england: expect.objectContaining({
              status: 'certified',
              firstCertifiedAt: '2025-05-10'
            }),
            scotland: expect.objectContaining({
              status: 'uncertified',
              firstCertifiedAt: null
            }),
            wales: expect.objectContaining({
              status: 'certified',
              firstCertifiedAt: '2025-05-25'
            }),
            northernIreland: expect.objectContaining({
              status: 'awaiting_decision',
              firstCertifiedAt: null
            })
          },
          canTogglePublicVisibility: true,
          isVisibleToPublic: true,
          isLegacyRecord: false,
          technicalReview: { status: 'accepted' }
        }
      })
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    test('defaults missing fields and logs a missing status', async () => {
      findCertified.mockReturnValueOnce([])
      collection.findOne.mockResolvedValue({
        id: 'FUEL-2'
      })

      const { data } = await getAdminFuelById(db, 'FUEL-2', mockLogger)

      expect(data).toMatchObject({
        name: '',
        applicationId: null,
        supplierType: null,
        status: 'pending',
        canTogglePublicVisibility: false,
        isVisibleToPublic: true,
        isLegacyRecord: false,
        technicalReview: null
      })
      expect(data.certifications.england).toMatchObject({
        status: 'awaiting_decision',
        firstCertifiedAt: null
      })
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('FUEL-2'),
        { fuelStatus: undefined }
      )
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('FUEL-2')
      )
    })

    test('reports a hidden fuel as not visible', async () => {
      findCertified.mockReturnValueOnce(['England'])
      collection.findOne.mockResolvedValue({
        id: 'FUEL-3',
        fuelStatus: 'hidden',
        isVisibleToPublic: false
      })

      const { data } = await getAdminFuelById(db, 'FUEL-3', mockLogger)

      expect(data.status).toBe('hidden')
      expect(data.isVisibleToPublic).toBe(false)
      expect(data.canTogglePublicVisibility).toBe(true)
    })

    test('returns not found', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await getAdminFuelById(db, 'missing', mockLogger)

      expect(result).toEqual({
        success: false,
        message: 'Fuel not found',
        notFound: true
      })
    })

    test('logs and rethrows database errors', async () => {
      collection.findOne.mockRejectedValue(new Error('db down'))

      await expect(getAdminFuelById(db, 'FUEL-1', mockLogger)).rejects.toThrow(
        'db down'
      )
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('requires a logger', async () => {
      await expect(getAdminFuelById(db, 'FUEL-1')).rejects.toThrow(
        'logger is required'
      )
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
