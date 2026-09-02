// Unit tests for the applications-controller.js module using Vitest
import { beforeEach, describe, test, expect, vi } from 'vitest'
import {
  createApplication,
  getAllApplications,
  getApplicationById,
  searchApplications,
  getCounts,
  getAllApplicationsWithAppliances,
  getApplicationsWithSummary,
  getApplicationSummaryById
} from '../applications-controller.js'

// Mock logger for testing
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}

describe('applications-controller', () => {
  let db
  let client
  let collection
  let applianceCollection
  let docs
  let applianceDocs
  let fuelDocs

  beforeEach(() => {
    // Reset logger mocks
    vi.clearAllMocks()

    // In-memory mock documents
    docs = []
    applianceDocs = []
    fuelDocs = []

    const matchesQuery = (doc, query) => {
      if (!query) return true
      if (query.$or) {
        return query.$or.some((condition) => {
          const field = Object.keys(condition)[0]
          const value = condition[field]
          if (value?.$regex) {
            const regex = new RegExp(value.$regex, value.$options || '')
            return regex.test(doc[field])
          }
          return doc[field] === value
        })
      }

      return Object.entries(query).every(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (value.$in) {
            return value.$in.includes(doc[key])
          }
          return false
        }
        return doc[key] === value
      })
    }

    // Mock appliance collection
    applianceCollection = {
      insertMany: vi.fn(async (docs, options) => {
        applianceDocs.push(...docs)
        return {
          acknowledged: true,
          insertedIds: docs.reduce((acc, doc, idx) => {
            acc[idx] = `mongo-id-${idx}`
            return acc
          }, {})
        }
      }),
      insertOne: vi.fn(async (doc) => {
        applianceDocs.push(doc)
        return {
          insertedId: `mongo-id`,
          acknowledged: true
        }
      }),
      find: vi.fn((query) => {
        const runToArray = async () => {
          return applianceDocs.filter((doc) => matchesQuery(doc, query))
        }

        return {
          sort: vi.fn(() => ({
            skip: vi.fn(() => ({
              limit: vi.fn(() => ({
                toArray: vi.fn(async () => runToArray())
              }))
            })),
            toArray: vi.fn(async () => runToArray())
          })),
          project: vi.fn(() => ({
            toArray: vi.fn(async () => runToArray())
          })),
          toArray: vi.fn(async () => runToArray())
        }
      }),
      findOne: vi.fn(async (query) => {
        return applianceDocs.find((doc) => matchesQuery(doc, query))
      }),
      countDocuments: vi.fn(async (query) => {
        return applianceDocs.filter((doc) => matchesQuery(doc, query)).length
      })
    }

    // Mock applications collection
    collection = {
      insertOne: vi.fn(async (doc, options) => {
        docs.push(doc)
        return {
          insertedId: doc.id || 'mock-id',
          acknowledged: true
        }
      }),
      findOne: vi.fn(async (query) => {
        return docs.find((doc) =>
          Object.entries(query).every(([key, value]) => doc[key] === value)
        )
      }),
      find: vi.fn((query) => {
        const matchesQuery = (doc, queryObject) => {
          if (!queryObject) return true
          if (queryObject.$or) {
            return queryObject.$or.some((condition) => {
              const field = Object.keys(condition)[0]
              const value = condition[field]
              if (value?.$regex) {
                const regex = new RegExp(value.$regex, value.$options || '')
                return regex.test(doc[field])
              }
              return doc[field] === value
            })
          }

          return Object.entries(queryObject).every(([key, value]) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              if (value.$in) {
                return value.$in.includes(doc[key])
              }
              return false
            }
            return doc[key] === value
          })
        }

        const runToArray = async () => {
          if (!query) return docs
          return docs.filter((doc) => matchesQuery(doc, query))
        }

        const chainedMethods = {
          sort: vi.fn((sort) => ({
            skip: vi.fn((skip) => ({
              limit: vi.fn((limit) => ({
                toArray: vi.fn(async () => runToArray())
              }))
            })),
            toArray: vi.fn(async () => runToArray())
          })),
          project: vi.fn(() => ({
            toArray: vi.fn(async () => runToArray())
          })),
          toArray: vi.fn(async () => runToArray())
        }
        return chainedMethods
      }),
      countDocuments: vi.fn(async (query) => {
        if (!query) return docs.length
        return docs.filter((doc) => {
          if (query.$or) {
            return query.$or.some((condition) => {
              const field = Object.keys(condition)[0]
              const value = condition[field]
              if (value?.$regex) {
                const regex = new RegExp(value.$regex, value.$options || '')
                return regex.test(doc[field])
              }
              return doc[field] === value
            })
          }
          return Object.entries(query).every(([key, value]) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              if (value.$in) {
                return value.$in.includes(doc[key])
              }
              return false
            }
            return doc[key] === value
          })
        }).length
      }),
      aggregate: vi.fn((pipeline) => ({
        toArray: vi.fn(async () => {
          // Simple aggregation mock for group count
          if (pipeline[0]?.$group) {
            const groupByType = {}
            docs.forEach((doc) => {
              const key = `${doc.type}-${doc.status}`
              groupByType[key] = (groupByType[key] || 0) + 1
            })
            return Object.entries(groupByType).map(([key, count]) => {
              const [type, status] = key.split('-')
              return {
                _id: { type, status },
                count
              }
            })
          }
          return []
        })
      }))
    }

    db = {
      collection: vi.fn((name) => {
        if (name === 'Applications') {
          return collection
        }
        if (name === 'Appliance' || name === 'Appliances') {
          return applianceCollection
        }
        if (name === 'Fuel' || name === 'Fuels') {
          // Return a fuel collection mock with same structure as appliance
          return {
            countDocuments: vi.fn(async (query) => {
              return fuelDocs.filter((doc) => matchesQuery(doc, query)).length
            }),
            findOne: vi.fn(async (query) => {
              return fuelDocs.find((doc) => matchesQuery(doc, query))
            }),
            find: vi.fn((query) => {
              const runToArray = async () =>
                fuelDocs.filter((doc) => matchesQuery(doc, query))
              return {
                project: vi.fn(() => ({
                  toArray: vi.fn(async () => runToArray())
                })),
                toArray: vi.fn(async () => runToArray())
              }
            })
          }
        }
        return collection
      })
    }

    // Mock client with session support
    client = {
      startSession: vi.fn(() => ({
        withTransaction: vi.fn(async (callback) => {
          return await callback()
        }),
        endSession: vi.fn(async () => {})
      }))
    }
  })

  describe('createApplication', () => {
    test('creates application and appliances successfully with transaction', async () => {
      const payload = {
        type: 'appliance',
        status: 'new',
        appliances: [
          {
            companyName: 'ACME',
            companyContact: {
              name: 'John Doe',
              email: 'john@acme.com',
              alternateEmail: 'alt@acme.com',
              phone: '+447537328906'
            },
            isUkBased: true,
            companyFullAddress: '123 Street',
            companyAddress: {
              line1: '456 Factory Road',
              line2: 'Unit 7',
              city: 'Birmingham',
              county: 'West Midlands',
              postcode: 'B1 2AB'
            },
            modelName: 'Model X',
            modelNumber: '123',
            applianceType: 'heat',
            isVariant: false,
            nominalOutput: 10,
            allowedFuels: ['Wood Logs'],
            instructionManual: {
              title: 'Manual X',
              date: new Date('2026-02-03'),
              version: 'Version 1'
            },
            declaration: true
          }
        ]
      }

      const result = await createApplication(client, db, payload, mockLogger)

      expect(result.success).toBe(true)
      expect(result.message).toBe(
        'Application and appliances created successfully'
      )
      expect(result.data.id).toBeDefined()
      expect(result.data.appliances).toHaveLength(1)
      expect(collection.insertOne).toHaveBeenCalled()
      expect(applianceCollection.insertMany).toHaveBeenCalled()
    })

    test('creates application without appliances', async () => {
      const payload = {
        type: 'fuel',
        status: 'new',
        additionalMetadata: {},
        appliances: []
      }

      const result = await createApplication(client, db, payload, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.appliances).toHaveLength(0)
      expect(collection.insertOne).toHaveBeenCalled()
    })

    test('invalid payloads should already be rejected before the controller', async () => {
      const payload = {
        type: 'appliance',
        appliances: [
          {
            // Missing required fields intentionally to verify controller does not revalidate
            companyName: 'ACME'
          }
        ]
      }

      const result = await createApplication(client, db, payload, mockLogger)

      expect(result.success).toBe(true)
      expect(applianceCollection.insertMany).toHaveBeenCalled()
      expect(result.data.appliances).toHaveLength(1)
    })

    test('throws error when application insert fails', async () => {
      collection.insertOne.mockRejectedValueOnce(new Error('Insert failed'))

      const payload = {
        type: 'appliance',
        appliances: []
      }

      await expect(
        createApplication(client, db, payload, mockLogger)
      ).rejects.toThrow('Insert failed')
    })

    test('throws when an application insert does not return an insertedId', async () => {
      collection.insertOne.mockResolvedValueOnce({ insertedId: null })

      await expect(
        createApplication(
          client,
          db,
          { type: 'fuel', appliances: [] },
          mockLogger
        )
      ).rejects.toThrow('Failed to insert application')
    })

    test('throws when an appliance insert is not acknowledged', async () => {
      applianceCollection.insertMany.mockResolvedValueOnce({
        acknowledged: false,
        insertedIds: {}
      })

      await expect(
        createApplication(
          client,
          db,
          { type: 'appliance', appliances: [{ companyName: 'ACME' }] },
          mockLogger
        )
      ).rejects.toThrow('MongoDB did not acknowledge appliance insert')
    })

    test('uses default values for optional application fields', async () => {
      const result = await createApplication(
        client,
        db,
        { type: 'fuel', appliances: [] },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('new')
      expect(result.data.reviewedBy).toBeNull()
      expect(result.data.submittedAt).toBeNull()
      expect(result.data.createdAt).toBeInstanceOf(Date)
    })

    test('preserves provided submittedAt, createdAt and referenceNumber', async () => {
      const payload = {
        type: 'fuel',
        status: 'in_progress',
        reviewedBy: { name: 'Reviewer', email: 'reviewer@example.com' },
        submittedAt: '2026-01-15T00:00:00.000Z',
        createdAt: '2026-01-10T00:00:00.000Z',
        referenceNumber: 'REF-001',
        appliances: []
      }

      const result = await createApplication(client, db, payload, mockLogger)

      expect(result.data.status).toBe('in_progress')
      expect(result.data.reviewedBy).toEqual(payload.reviewedBy)
      expect(result.data.submittedAt).toEqual(new Date(payload.submittedAt))
      expect(result.data.createdAt).toEqual(new Date(payload.createdAt))
      expect(result.data.referenceNumber).toBe('REF-001')
    })

    test('handles appliance insert results without insertedIds (auto-created collection)', async () => {
      applianceCollection.insertMany.mockImplementationOnce(async (docs) => {
        applianceDocs.push(...docs)
        return { acknowledged: true }
      })

      const payload = {
        type: 'appliance',
        appliances: [{ companyName: 'ACME' }]
      }

      const result = await createApplication(client, db, payload, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.appliances[0]._id).toBeUndefined()
    })

    test('handles transaction fallback for standalone MongoDB', async () => {
      const sessionError = new Error(
        'Transactions are not allowed on this replset'
      )
      const fallbackClient = {
        startSession: vi.fn(() => ({
          withTransaction: vi.fn(async () => {
            throw sessionError
          }),
          endSession: vi.fn(async () => {})
        }))
      }

      const payload = {
        type: 'appliance',
        appliances: []
      }

      const result = await createApplication(
        fallbackClient,
        db,
        payload,
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })

  describe('getAllApplications', () => {
    test('returns all applications successfully', async () => {
      docs.push({
        id: 'app-1',
        type: 'appliance',
        status: 'new',
        createdAt: new Date(),
        submittedAt: new Date()
      })
      docs.push({
        id: 'app-2',
        type: 'fuel',
        status: 'in_progress',
        createdAt: new Date(),
        submittedAt: new Date()
      })

      const result = await getAllApplications(db, {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Applications retrieved successfully')
      expect(result.data).toHaveLength(2)
      expect(collection.find).toHaveBeenCalledWith({})
    })

    test('returns empty array when no applications exist', async () => {
      const result = await getAllApplications(db, {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    test('sorts applications by submittedAt and createdAt descending', async () => {
      await getAllApplications(db, {}, mockLogger)

      expect(collection.find).toHaveBeenCalledWith({})
      const findCall = collection.find.mock.calls[0]
      expect(findCall).toBeDefined()
    })

    test('handles database errors', async () => {
      collection.find.mockImplementationOnce(() => {
        throw new Error('Database connection failed')
      })

      await expect(getAllApplications(db, {}, mockLogger)).rejects.toThrow(
        'Database connection failed'
      )
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('getApplicationById', () => {
    test('returns application when found', async () => {
      const mockApp = {
        id: 'app-123',
        type: 'appliance',
        status: 'new',
        createdAt: new Date()
      }
      collection.findOne.mockResolvedValueOnce(mockApp)

      const result = await getApplicationById(db, 'app-123', mockLogger)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Application retrieved successfully')
      expect(result.data.id).toBe('app-123')
      expect(collection.findOne).toHaveBeenCalledWith({
        id: 'app-123'
      })
    })

    test('returns notFound when application does not exist', async () => {
      collection.findOne.mockResolvedValueOnce(null)

      const result = await getApplicationById(db, 'app-nonexistent', mockLogger)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Application not found')
      expect(result.notFound).toBe(true)
    })

    test('fetches linked appliances when type is appliance', async () => {
      const mockApp = {
        id: 'app-123',
        type: 'appliance',
        status: 'new'
      }
      collection.findOne.mockResolvedValueOnce(mockApp)
      applianceDocs.push({ id: 'app-001', applicationId: 'app-123' })

      const result = await getApplicationById(db, 'app-123', mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.linkedItems).toBeDefined()
    })

    test('fetches linked fuel records when type is fuel', async () => {
      const mockApp = {
        id: 'app-456',
        type: 'fuel',
        status: 'new'
      }
      collection.findOne.mockResolvedValueOnce(mockApp)
      const fuelCollection = {
        find: vi.fn(() => ({
          toArray: vi.fn(async () => [
            { applicationId: 'app-456', fuelId: 'FUEL-1' }
          ])
        }))
      }
      db.collection = vi.fn((name) => {
        if (name === 'Applications') return collection
        if (name === 'Appliances') return applianceCollection
        if (name === 'Fuels') return fuelCollection
        return collection
      })

      const result = await getApplicationById(db, 'app-456', mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.linkedItems).toEqual([
        { applicationId: 'app-456', fuelId: 'FUEL-1' }
      ])
    })

    test('logs a warning and returns no linked items for unknown application types', async () => {
      const mockApp = {
        id: 'app-999',
        type: 'unknown',
        status: 'new'
      }
      collection.findOne.mockResolvedValueOnce(mockApp)

      const result = await getApplicationById(db, 'app-999', mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.linkedItems).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown application type: unknown'
      )
    })

    test('handles database errors', async () => {
      collection.findOne.mockRejectedValueOnce(new Error('Query failed'))

      await expect(
        getApplicationById(db, 'app-123', mockLogger)
      ).rejects.toThrow('Query failed')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('searchApplications', () => {
    test('searches applications by query', async () => {
      docs.push({
        id: 'app-1',
        status: 'new',
        reviewedBy: 'John'
      })
      docs.push({
        id: 'app-2',
        status: 'in_progress',
        reviewedBy: 'Jane'
      })

      const result = await searchApplications(
        db,
        { query: 'John', page: 1, limit: 20 },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.message).toBe('Applications search completed successfully')
      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
    })

    test('returns pagination info with total count', async () => {
      for (let i = 0; i < 5; i++) {
        docs.push({
          id: `app-${i}`,
          status: 'new',
          reviewedBy: 'Test'
        })
      }

      const result = await searchApplications(
        db,
        { query: 'Test', page: 1, limit: 2 },
        mockLogger
      )

      expect(result.pagination.total).toBeGreaterThan(0)
      expect(result.pagination.totalPages).toBeDefined()
    })

    test('returns empty results when no matches found', async () => {
      const result = await searchApplications(
        db,
        { query: 'nonexistent', page: 1, limit: 20 },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    test('handles database errors', async () => {
      collection.find.mockImplementationOnce(() => {
        throw new Error('Search failed')
      })

      await expect(
        searchApplications(
          db,
          { query: 'test', page: 1, limit: 20 },
          mockLogger
        )
      ).rejects.toThrow('Search failed')
    })

    test('matches reviewedBy fields when searching', async () => {
      docs.push({
        id: 'app-nested',
        status: 'new',
        reviewedBy: 'Alice'
      })

      const result = await searchApplications(
        db,
        { query: 'Alice', page: 1, limit: 20 },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('app-nested')
    })
  })

  describe('getCounts', () => {
    test('returns application counts by type and status', async () => {
      docs.push({
        id: 'app-1',
        type: 'appliance',
        status: 'new'
      })
      docs.push({
        id: 'app-2',
        type: 'appliance',
        status: 'in_progress'
      })
      docs.push({
        id: 'app-3',
        type: 'fuel',
        status: 'new'
      })

      const result = await getCounts(db, mockLogger)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Application counts retrieved successfully')
      expect(result.data).toHaveProperty('appliance')
      expect(result.data).toHaveProperty('fuel')
    })

    test('initializes all counts to zero', async () => {
      const result = await getCounts(db, mockLogger)

      expect(result.data.appliance.new).toBeDefined()
      expect(result.data.appliance.inProgress).toBeDefined()
      expect(result.data.appliance.records).toBeDefined()
      expect(result.data.fuel.new).toBeDefined()
      expect(result.data.fuel.inProgress).toBeDefined()
      expect(result.data.fuel.records).toBeDefined()
    })

    test('handles database errors', async () => {
      collection.aggregate.mockImplementationOnce(() => {
        throw new Error('Aggregation failed')
      })

      await expect(getCounts(db, mockLogger)).rejects.toThrow(
        'Aggregation failed'
      )
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('ignores status counts for types not tracked in the counts map', async () => {
      docs.push({
        id: 'app-1',
        type: 'unknownType',
        status: 'new'
      })
      docs.push({
        id: 'app-2',
        type: 'appliance',
        status: 'new'
      })

      const result = await getCounts(db, mockLogger)

      expect(result.data.appliance.new).toBe(1)
      expect(result.data).not.toHaveProperty('unknownType')
    })

    test('counts complete application records and legacy appliance records', async () => {
      docs.push(
        {
          id: 'app-1',
          type: 'appliance',
          status: 'complete'
        },
        {
          id: 'app-2',
          type: 'fuel',
          status: 'complete'
        },
        {
          id: 'app-3',
          type: 'appliance',
          status: 'new'
        }
      )
      applianceDocs.push(
        {
          id: 'appl-1',
          applicationId: 'app-1'
        },
        {
          id: 'appl-2',
          applicationId: 'app-3',
          legacyRecord: true
        }
      )

      const result = await getCounts(db, mockLogger)

      expect(result.data.appliance.records).toBe(2)
      expect(result.data.fuel.records).toBe(0)
    })
  })

  describe('getAllApplicationsWithAppliances', () => {
    test('returns applications with nested appliances', async () => {
      docs.push({
        id: 'app-1',
        type: 'appliance',
        status: 'new'
      })
      applianceDocs.push({
        id: 'app-001',
        applicationId: 'app-1',
        companyName: 'ACME'
      })

      const result = await getAllApplicationsWithAppliances(db, mockLogger)

      expect(Array.isArray(result)).toBe(true)
      expect(result[0].appliances).toBeDefined()
      expect(mockLogger.info).toHaveBeenCalled()
    })

    test('handles empty collections', async () => {
      const result = await getAllApplicationsWithAppliances(db, mockLogger)

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
    })

    test('filters appliances by applicationId', async () => {
      docs.push(
        {
          id: 'app-1',
          type: 'appliance',
          status: 'new'
        },
        {
          id: 'app-2',
          type: 'appliance',
          status: 'new'
        }
      )
      applianceDocs.push(
        {
          id: 'app-001',
          applicationId: 'app-1'
        },
        {
          id: 'app-002',
          applicationId: 'app-2'
        }
      )

      const result = await getAllApplicationsWithAppliances(db, mockLogger)

      expect(result[0].appliances).toHaveLength(1)
      expect(result[0].appliances[0].applicationId).toBe('app-1')
    })

    test('handles database errors', async () => {
      collection.find.mockImplementationOnce(() => {
        throw new Error('Fetch failed')
      })

      await expect(
        getAllApplicationsWithAppliances(db, mockLogger)
      ).rejects.toThrow('Fetch failed')
    })
  })

  describe('getApplicationsWithSummary', () => {
    test('returns applications grouped by status with appliance model names', async () => {
      docs.push(
        {
          id: 'app-1',
          type: 'appliance',
          status: 'new',
          submittedAt: new Date('2026-01-01'),
          createdAt: new Date('2026-01-02')
        },
        {
          id: 'app-2',
          type: 'appliance',
          status: 'in_progress',
          submittedAt: new Date('2026-01-03'),
          createdAt: new Date('2026-01-04')
        }
      )
      applianceDocs.push(
        {
          _id: 'appl-1',
          applicationId: 'app-1',
          modelName: 'Model A'
        },
        {
          _id: 'appl-2',
          applicationId: 'app-2',
          modelName: 'Model B'
        }
      )

      const result = await getApplicationsWithSummary(db, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.new).toHaveLength(1)
      expect(result.data.inProgress).toHaveLength(1)
      expect(result.data.new[0].appliances[0].modelName).toBe('Model A')
      expect(result.data.inProgress[0].appliances[0].modelName).toBe('Model B')
    })

    test('returns empty result when no matching applications exist', async () => {
      const result = await getApplicationsWithSummary(db, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.new).toEqual([])
      expect(result.data.inProgress).toEqual([])
    })

    test('handles database errors', async () => {
      collection.find.mockImplementationOnce(() => {
        throw new Error('Summary fetch failed')
      })

      await expect(getApplicationsWithSummary(db, mockLogger)).rejects.toThrow(
        'Summary fetch failed'
      )
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('logs a warning and omits applications with an unknown status', async () => {
      docs.push({
        id: 'app-1',
        type: 'appliance',
        status: 'archived'
      })

      const result = await getApplicationsWithSummary(db, mockLogger, [
        'archived'
      ])

      expect(result.data.new).toEqual([])
      expect(result.data.inProgress).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown application status: archived'
      )
    })
  })

  describe('getApplicationSummaryById', () => {
    test('returns notFound when application does not exist', async () => {
      const result = await getApplicationSummaryById(
        db,
        'app-missing',
        'appliance',
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.message).toBe('Application not found')
      expect(result.notFound).toBe(true)
    })

    test('returns summary with company details and linked appliances', async () => {
      docs.push({ id: 'app-1', type: 'appliance' })
      applianceDocs.push({
        applicationId: 'app-1',
        companyName: 'ACME',
        companyFullAddress: '123 Street',
        companyAddress: { city: 'London' },
        companyContact: { name: 'Jane', email: 'jane@acme.com' },
        modelName: 'Model A',
        technicalReview: { status: 'accepted' }
      })

      const result = await getApplicationSummaryById(
        db,
        'app-1',
        'appliance',
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.message).toBe('Application summary retrieved successfully')
      expect(result.data.id).toBe('app-1')
      expect(result.data.companyName).toBe('ACME')
      expect(result.data.companyFullAddress).toBe('123 Street')
      expect(result.data.companyAddress).toEqual({ city: 'London' })
      expect(result.data.companyContact).toEqual({
        name: 'Jane',
        email: 'jane@acme.com'
      })
      expect(result.data.linkedItems).toHaveLength(1)
      expect(result.data.linkedItems[0]).toMatchObject({
        modelName: 'Model A',
        technicalReview: { status: 'accepted' }
      })
    })

    test('returns summary with linked fuels when type is fuel', async () => {
      docs.push({ id: 'app-2', type: 'fuel' })
      fuelDocs.push({
        applicationId: 'app-2',
        companyName: 'Fuel Co',
        modelName: 'Fuel A',
        technicalReview: { status: 'new' }
      })

      const result = await getApplicationSummaryById(
        db,
        'app-2',
        'fuel',
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.companyName).toBe('Fuel Co')
      expect(result.data.linkedItems).toHaveLength(1)
      expect(result.data.linkedItems[0].modelName).toBe('Fuel A')
    })

    test('returns null company fields when no linked item exists', async () => {
      docs.push({ id: 'app-3', type: 'appliance' })

      const result = await getApplicationSummaryById(
        db,
        'app-3',
        'appliance',
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.companyName).toBeUndefined()
      expect(result.data.companyFullAddress).toBeNull()
      expect(result.data.companyAddress).toBeNull()
      expect(result.data.linkedItems).toEqual([])
    })

    test('handles database errors', async () => {
      collection.findOne.mockRejectedValueOnce(
        new Error('Summary query failed')
      )

      await expect(
        getApplicationSummaryById(db, 'app-1', 'appliance', mockLogger)
      ).rejects.toThrow('Summary query failed')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})
