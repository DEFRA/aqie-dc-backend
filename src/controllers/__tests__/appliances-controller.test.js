import { describe, test, expect, beforeEach, vi } from 'vitest'

import {
  createAppliance,
  getAllAppliances,
  getApplianceById,
  updateAppliance,
  deleteAppliance,
  searchAdminAppliances,
  getAdminApplianceById,
  updateApplianceVisibility
} from '#src/controllers/appliances-controller.js'

import { generateSecureId } from '#src/common/helpers/data-transformer.js'
import { calculateItemStatus } from '#src/common/helpers/item-status.js'

vi.mock('#src/common/helpers/item-status.js', () => ({
  calculateItemStatus: vi.fn()
}))

// Only generateSecureId is non-deterministic (uses crypto), so it's the only
// helper mocked here. findCertified/getFullAddress run for real so tests
// exercise the actual mapping logic instead of asserting on fake data.
vi.mock('#src/common/helpers/data-transformer.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    generateSecureId: vi.fn()
  }
})

const certifiedInEngland = {
  englandCertification: { status: 'certified' },
  scotlandCertification: { status: 'awaiting_decision' },
  walesCertification: { status: 'awaiting_decision' },
  nIrelandCertification: { status: 'awaiting_decision' }
}

const ukAddress = {
  companyAddress: {
    line1: '1 Test Street',
    line2: '',
    city: 'Testville',
    county: '',
    postcode: 'AB1 2CD'
  }
}

describe('appliances-controller', () => {
  let db
  let collection
  let mockLogger

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
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
  })

  describe('createAppliance', () => {
    test('creates appliance successfully', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: 'mongo-id'
      })

      const result = await createAppliance(
        db,
        {
          modelName: 'Example Appliance'
        },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result._id).toBe('mongo-id')
      expect(result.data.id).toBe('APP-12345')
      expect(mockLogger.info).toHaveBeenCalled()
    })

    test('uses existing id if supplied', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: 'mongo-id'
      })

      const result = await createAppliance(
        db,
        {
          id: 'APP-001'
        },
        mockLogger
      )

      expect(result.data.id).toBe('APP-001')
      expect(generateSecureId).not.toHaveBeenCalled()
    })

    test('throws if db missing', async () => {
      await expect(createAppliance(null, {}, mockLogger)).rejects.toThrow(
        'db is required'
      )
    })

    test('throws if item missing', async () => {
      await expect(createAppliance(db, null, mockLogger)).rejects.toThrow(
        'item is required'
      )
    })

    test('throws if logger missing', async () => {
      await expect(createAppliance(db, {})).rejects.toThrow(
        'logger is required'
      )
    })

    test('throws when insert not acknowledged', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: false
      })

      await expect(createAppliance(db, {}, mockLogger)).rejects.toThrow(
        'Failed to insert appliance'
      )

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('logs database errors', async () => {
      collection.insertOne.mockRejectedValue(new Error('insert failed'))

      await expect(createAppliance(db, {}, mockLogger)).rejects.toThrow(
        'insert failed'
      )

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('persists generated appliance id to database', async () => {
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: 'mongo-id'
      })

      await createAppliance(db, { modelName: 'Test Appliance' }, mockLogger)

      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'APP-12345'
        })
      )
    })
  })

  describe('getAllAppliances', () => {
    test('returns all certified appliances', async () => {
      const appliances = [
        {
          id: 'APP-001',
          modelName: 'Certified Model',
          companyName: 'Test Company',
          permittedFuels: 'Wood',
          ...certifiedInEngland
        }
      ]

      const cursor = {
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(appliances)
      }

      collection.find.mockReturnValue(cursor)

      const result = await getAllAppliances(db, {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Certified Model')
      expect(result.data[0].id).toBe('APP-001')
      expect(result.data[0].authorisedIn).toEqual(['England'])
    })

    test('queries certified appliances only', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([])
      }

      collection.find.mockReturnValue(cursor)

      await getAllAppliances(db, {}, mockLogger)

      expect(collection.find).toHaveBeenCalledWith({
        isVisibleToPublic: true
      })
    })

    test('maps appliance summary correctly', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            id: 'APP-001',
            modelName: 'Test Model',
            companyName: 'Test Corp',
            applianceType: 'boiler',
            modelNumber: 'M123',
            permittedFuels: 'Wood, Coal',
            ...certifiedInEngland
          }
        ])
      }

      collection.find.mockReturnValue(cursor)

      const result = await getAllAppliances(db, {}, mockLogger)

      const summary = result.data[0]

      expect(summary.name).toBe('Test Model')
      expect(summary.manufacturer).toBe('Test Corp')
      expect(summary.type).toBe('boiler')
      expect(summary.modelNumber).toBe('M123')
      expect(summary.authorisedIn).toEqual(['England'])
    })

    test('handles fuels array correctly', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            modelName: 'Fuel Test',
            permittedFuels: 'Wood Logs'
          }
        ])
      }

      collection.find.mockReturnValue(cursor)

      const result = await getAllAppliances(db, {}, mockLogger)

      expect(result.data[0].permittedFuels).toBe('Wood Logs')
    })

    test('throws when logger missing', async () => {
      await expect(getAllAppliances(db)).rejects.toThrow('logger is required')
    })

    test('handles database errors', async () => {
      collection.find.mockImplementation(() => {
        throw new Error('query failed')
      })

      await expect(getAllAppliances(db, {}, mockLogger)).rejects.toThrow(
        'query failed'
      )

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('getApplianceById', () => {
    test('returns appliance detail', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-001',
        modelName: 'Detail Model',
        companyName: 'Detail Corp',
        ...certifiedInEngland,
        ...ukAddress
      })

      const result = await getApplianceById(db, 'APP-001', mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.fullAddress).toEqual([
        '1 Test Street',
        'Testville',
        'AB1 2CD'
      ])
      expect(result.data.authorisedIn).toEqual(['England'])
    })

    test('returns not found', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await getApplianceById(db, 'missing', mockLogger)

      expect(result.notFound).toBe(true)
    })
  })

  describe('getAdminApplianceById', () => {
    test('returns the admin fields for the appliance', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-001',
        modelName: 'Admin Model',
        modelNumber: 'AM-001',
        applicationId: 'APPL-001',
        isLegacyRecord: true,
        isVisibleToPublic: false,
        ...certifiedInEngland,
        applianceStatus: 'live'
      })

      const result = await getAdminApplianceById(db, 'APP-001', mockLogger)

      expect(result).toEqual({
        success: true,
        data: {
          id: 'APP-001',
          modelName: 'Admin Model',
          modelNumber: 'AM-001',
          applicationId: 'APPL-001',
          certifications: {
            england: {
              status: 'certified',
              firstCertifiedAt: null,
              lastCertifiedAt: null
            },
            scotland: {
              status: 'awaiting_decision',
              firstCertifiedAt: null,
              lastCertifiedAt: null
            },
            wales: {
              status: 'awaiting_decision',
              firstCertifiedAt: null,
              lastCertifiedAt: null
            },
            northernIreland: {
              status: 'awaiting_decision',
              firstCertifiedAt: null,
              lastCertifiedAt: null
            }
          },
          status: 'live',
          canTogglePublicVisibility: true,
          isVisibleToPublic: false,
          isLegacyRecord: true
        }
      })
    })

    test('defaults missing status and certifications', async () => {
      collection.findOne.mockResolvedValue({ id: 'APP-002' })

      const result = await getAdminApplianceById(db, 'APP-002', mockLogger)

      expect(result.data.status).toBe('pending')
      expect(result.data.certifications.england).toEqual({
        status: 'awaiting_decision',
        firstCertifiedAt: null,
        lastCertifiedAt: null
      })
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('APP-002')
      )
      expect(result.data.applicationId).toBeNull()
      expect(result.data.canTogglePublicVisibility).toBe(false)
      expect(result.data.isVisibleToPublic).toBeUndefined()
      expect(result.data.isLegacyRecord).toBeUndefined()
    })

    test('returns not found', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await getAdminApplianceById(db, 'missing', mockLogger)

      expect(result.notFound).toBe(true)
      expect(result.success).toBe(false)
    })

    test('logs and rethrows database errors', async () => {
      collection.findOne.mockRejectedValue(new Error('db down'))

      await expect(
        getAdminApplianceById(db, 'APP-001', mockLogger)
      ).rejects.toThrow('db down')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('requires a logger', async () => {
      await expect(getAdminApplianceById(db, 'APP-001')).rejects.toThrow(
        'logger is required'
      )
    })
  })

  describe('updateAppliance', () => {
    test('updating one nested field leaves its siblings alone', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({ id: 'APP-1' })

      await updateAppliance(
        db,
        'APP-1',
        { englandCertification: { status: 'certified' } },
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty(
        'englandCertification.status',
        'certified'
      )
      expect(update.$set).not.toHaveProperty('englandCertification')
    })

    test('still writes flat fields unchanged', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({ id: 'APP-1' })

      await updateAppliance(db, 'APP-1', { modelName: 'Model Y' }, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set.modelName).toBe('Model Y')
      expect(update.$set.updatedAt).toBeInstanceOf(Date)
    })

    test('returns not found', async () => {
      collection.updateOne.mockResolvedValue({
        matchedCount: 0
      })

      const result = await updateAppliance(db, 'APP-001', {}, mockLogger)

      expect(result.notFound).toBe(true)
    })
  })

  describe('deleteAppliance', () => {
    test('deletes appliance', async () => {
      collection.deleteOne.mockResolvedValue({
        deletedCount: 1
      })

      const result = await deleteAppliance(db, 'APP-001', mockLogger)

      expect(result.deleted).toBe(true)
    })

    test('returns not found', async () => {
      collection.deleteOne.mockResolvedValue({
        deletedCount: 0
      })

      const result = await deleteAppliance(db, 'APP-001', mockLogger)

      expect(result.notFound).toBe(true)
    })
  })

  describe('searchAdminAppliances', () => {
    test('returns paginated results', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            id: 'APP-001',
            modelName: 'Search Model'
          }
        ])
      }

      collection.find.mockReturnValue(cursor)
      collection.countDocuments.mockResolvedValue(41)

      const result = await searchAdminAppliances(
        db,
        {
          query: 'search',
          page: 2,
          limit: 20
        },
        mockLogger
      )

      expect(result.pagination.totalPages).toBe(3)
      expect(result.pagination.total).toBe(41)
    })

    test('trims query and status input before building db filters', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            id: 'APP-002',
            modelName: 'Trimmed Model',
            applianceStatus: 'pending'
          }
        ])
      }

      collection.find.mockReturnValue(cursor)
      collection.countDocuments.mockResolvedValue(1)

      await searchAdminAppliances(
        db,
        {
          query: '  boiler  ',
          page: 1,
          limit: 20,
          statuses: ['  live  ', '', 'pending']
        },
        mockLogger
      )

      const searchQuery = collection.find.mock.calls[0][0]
      expect(searchQuery.$or).toEqual([
        { modelName: { $regex: 'boiler', $options: 'i' } },
        { companyName: { $regex: 'boiler', $options: 'i' } },
        { modelNumber: { $regex: 'boiler', $options: 'i' } },
        { applianceType: { $regex: 'boiler', $options: 'i' } }
      ])
      expect(searchQuery.applianceStatus.$in).toHaveLength(2)
      expect(searchQuery.applianceStatus.$in[0]).toBeInstanceOf(RegExp)
      expect(searchQuery.applianceStatus.$in[1]).toBeInstanceOf(RegExp)
    })

    test('applies case-insensitive status filter', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            id: 'APP-001',
            modelName: 'Live Appliance',
            applianceStatus: 'Live'
          }
        ])
      }

      collection.find.mockReturnValue(cursor)
      collection.countDocuments.mockResolvedValue(1)

      const result = await searchAdminAppliances(
        db,
        {
          query: '',
          page: 1,
          limit: 20,
          statuses: ['live']
        },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.length).toBe(1)

      // Verify the search query uses regex for case-insensitive matching
      const searchQuery = collection.find.mock.calls[0][0]
      expect(searchQuery.applianceStatus).toBeDefined()
      expect(searchQuery.applianceStatus.$in).toBeDefined()
      expect(searchQuery.applianceStatus.$in).toHaveLength(1)
      // Each status should be converted to a regex pattern
      const regexPattern = searchQuery.applianceStatus.$in[0]
      expect(regexPattern).toBeInstanceOf(RegExp)
      expect(regexPattern.test('live')).toBe(true)
      expect(regexPattern.test('Live')).toBe(true)
      expect(regexPattern.test('LIVE')).toBe(true)
    })

    test('throws if logger is missing', async () => {
      await expect(
        searchAdminAppliances(db, { query: 'boiler' }, undefined)
      ).rejects.toThrow('logger is required')
    })

    test('returns empty results with zero total pages when there are no matches', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([])
      }

      collection.find.mockReturnValue(cursor)
      collection.countDocuments.mockResolvedValue(0)

      const result = await searchAdminAppliances(
        db,
        { query: 'no-match', page: 1, limit: 20, statuses: [] },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    test('searches by technical review status even when query is blank', async () => {
      const cursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([])
      }

      collection.find.mockReturnValue(cursor)
      collection.countDocuments.mockResolvedValue(0)

      await searchAdminAppliances(
        db,
        { query: '   ', page: 1, limit: 20 },
        mockLogger
      )

      const searchQuery = collection.find.mock.calls[0][0]
      expect(searchQuery['technicalReview.status']).toEqual({
        $in: ['accepted', 'rejected']
      })
      expect(searchQuery.$or).toBeUndefined()
      expect(searchQuery.applianceStatus).toBeUndefined()
    })
  })

  describe('updateApplianceVisibility', () => {
    const acceptedAndCertified = {
      technicalReview: { status: 'accepted' },
      ...certifiedInEngland
    }

    beforeEach(() => {
      calculateItemStatus.mockReset()
    })

    test('sets visibility and recalculates status', async () => {
      collection.findOne.mockResolvedValue(acceptedAndCertified)
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      calculateItemStatus.mockResolvedValue('hidden')

      const result = await updateApplianceVisibility(
        db,
        'APP-1',
        false,
        mockLogger
      )

      expect(collection.updateOne).toHaveBeenCalledWith(
        { id: 'APP-1' },
        { $set: { isVisibleToPublic: false, updatedAt: expect.any(Date) } }
      )
      expect(calculateItemStatus).toHaveBeenCalledWith(db, 'appliance', 'APP-1')
      expect(result).toEqual({ success: true })
    })

    test('uses the Fuels collection and fuel status for type fuel', async () => {
      collection.findOne.mockResolvedValue(acceptedAndCertified)
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      calculateItemStatus.mockResolvedValue('hidden')

      const result = await updateApplianceVisibility(
        db,
        'FUEL-1',
        false,
        mockLogger,
        'fuel'
      )

      expect(db.collection).toHaveBeenCalledWith('Fuels')
      expect(calculateItemStatus).toHaveBeenCalledWith(db, 'fuel', 'FUEL-1')
      expect(result).toEqual({ success: true })
    })

    test('rejects an unsupported type', async () => {
      await expect(
        updateApplianceVisibility(db, 'X-1', true, mockLogger, 'widget')
      ).rejects.toThrow('Unsupported item type: widget')
    })

    test('returns not found when appliance missing', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await updateApplianceVisibility(
        db,
        'missing',
        true,
        mockLogger
      )

      expect(result.notFound).toBe(true)
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test.each([
      ['review is pending', { technicalReview: { status: 'pending' } }],
      ['review is rejected', { technicalReview: { status: 'rejected' } }],
      ['no review exists', {}],
      [
        'accepted but not certified anywhere',
        { technicalReview: { status: 'accepted' } }
      ]
    ])('returns incomplete when %s', async (_label, item) => {
      collection.findOne.mockResolvedValue({ ...item })

      const result = await updateApplianceVisibility(
        db,
        'APP-1',
        false,
        mockLogger
      )

      expect(result.incomplete).toBe(true)
      expect(collection.updateOne).not.toHaveBeenCalled()
      expect(calculateItemStatus).not.toHaveBeenCalled()
    })

    test('rethrows and logs status calculation errors', async () => {
      collection.findOne.mockResolvedValue(acceptedAndCertified)
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      calculateItemStatus.mockRejectedValue(new Error('calc failed'))

      await expect(
        updateApplianceVisibility(db, 'APP-1', true, mockLogger)
      ).rejects.toThrow('calc failed')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})
