import { describe, test, expect, beforeEach, vi } from 'vitest'

import {
  createAppliance,
  getAllAppliances,
  getApplianceById,
  updateAppliance,
  deleteAppliance,
  searchAppliances,
  getApplianceWithRelatedItems
} from '#src/controllers/appliances-controller.js'

import { generateSecureId } from '#src/common/helpers/data-transformer.js'

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
          allowedFuels: ['Wood'],
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
        $or: [
          { 'englandCertification.status': 'certified' },
          { 'scotlandCertification.status': 'certified' },
          { 'walesCertification.status': 'certified' },
          { 'nIrelandCertification.status': 'certified' }
        ]
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
            allowedFuels: ['Wood', 'Coal'],
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
            allowedFuels: ['Wood Logs']
          }
        ])
      }

      collection.find.mockReturnValue(cursor)

      const result = await getAllAppliances(db, {}, mockLogger)

      expect(result.data[0].fuels).toBe('Wood Logs')
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

  describe('searchAppliances', () => {
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

      const result = await searchAppliances(
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
  })

  describe('getApplianceWithRelatedItems', () => {
    test('returns appliance with details', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-001',
        modelName: 'Related Appliance',
        ...certifiedInEngland,
        ...ukAddress
      })

      const result = await getApplianceWithRelatedItems(
        db,
        'APP-001',
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.authorisedIn).toEqual(['England'])
      expect(result.data.fullAddress).toEqual([
        '1 Test Street',
        'Testville',
        'AB1 2CD'
      ])
    })

    test('returns not found when appliance missing', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await getApplianceWithRelatedItems(
        db,
        'missing',
        mockLogger
      )

      expect(result.notFound).toBe(true)
    })
  })
})
