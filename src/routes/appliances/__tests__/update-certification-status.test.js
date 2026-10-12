import { describe, it, expect, beforeEach, vi } from 'vitest'
import { updateCertificationStatus } from '../update-certification-status.js'

describe('Update Certification Status Route', () => {
  let mockRequest
  let mockH
  let mockDb
  let mockCollection

  beforeEach(() => {
    mockCollection = {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn()
    }

    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    }

    mockH = {
      response: vi.fn((data) => ({
        code: vi.fn((statusCode) => ({
          statusCode,
          data
        }))
      }))
    }

    mockRequest = {
      params: {
        id: 'APP-001',
        country: 'england'
      },
      payload: {
        status: 'certified'
      },
      db: mockDb,
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn()
      },
      auth: {
        credentials: {
          name: 'Test User',
          email: 'test@example.com'
        }
      }
    }
  })

  describe('handler', () => {
    it('should return 200 with updated appliance on success', async () => {
      const appliance = {
        id: 'APP-001',
        modelName: 'Test Stove',
        englandCertification: { status: 'certified' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: appliance
      })

      const response = await updateCertificationStatus.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith(appliance)
      expect(response.statusCode).toBe(200)
    })

    it('should validate country parameter', async () => {
      mockRequest.params.country = 'invalid-country'

      const response = await updateCertificationStatus.handler(mockRequest, mockH)

      expect(response.statusCode).toBe(400)
    })

    it('should validate status parameter', async () => {
      mockRequest.payload.status = 'invalid-status'

      const response = await updateCertificationStatus.handler(mockRequest, mockH)

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 when appliance not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null)

      mockRequest.payload = {
        status: 'certified'
      }

      const response = await updateCertificationStatus.handler(mockRequest, mockH)

      expect(response.statusCode).toBe(404)
    })

    it('should return 400 for invalid status transition', async () => {
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'certified' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockRequest.payload.status = 'awaiting_decision' // Invalid transition from certified

      const response = await updateCertificationStatus.handler(mockRequest, mockH)

      expect(response.statusCode).toBe(400)
    })

    it('should use request auth credentials as decidedBy', async () => {
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'awaiting_decision' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: appliance
      })

      mockRequest.payload = {
        status: 'certified'
        // No decidedBy provided
      }

      await updateCertificationStatus.handler(mockRequest, mockH)

      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.decidedBy).toEqual({
        name: 'Test User',
        email: 'test@example.com'
      })
    })

    it('should use provided decidedBy if included in payload', async () => {
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'awaiting_decision' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: appliance
      })

      const customDecidedBy = {
        name: 'Custom User',
        email: 'custom@example.com'
      }

      mockRequest.payload = {
        status: 'certified',
        decidedBy: customDecidedBy
      }

      await updateCertificationStatus.handler(mockRequest, mockH)

      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.decidedBy).toEqual(customDecidedBy)
    })

    it('should handle all valid countries', async () => {
      const countries = ['england', 'scotland', 'wales', 'northern-ireland']
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'awaiting_decision' },
        scotlandCertification: { status: 'awaiting_decision' },
        walesCertification: { status: 'awaiting_decision' },
        nIrelandCertification: { status: 'awaiting_decision' }
      }

      for (const country of countries) {
        mockCollection.findOne.mockResolvedValueOnce(appliance)
        mockCollection.findOneAndUpdate.mockResolvedValueOnce({
          value: appliance
        })

        mockRequest.params.country = country

        const response = await updateCertificationStatus.handler(mockRequest, mockH)

        expect(response.statusCode).toBe(200)
      }
    })

    it('should return 500 on internal server error', async () => {
      mockCollection.findOne.mockRejectedValueOnce(new Error('Database error'))

      const response = await updateCertificationStatus.handler(mockRequest, mockH)

      expect(response.statusCode).toBe(500)
    })

    it('should map uncertified to revoked status', async () => {
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'certified' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: appliance
      })

      mockRequest.payload.status = 'uncertified'

      const response = await updateCertificationStatus.handler(mockRequest, mockH)

      expect(response.statusCode).toBe(200)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.status).toBe('revoked')
    })

    it('should require status in payload', async () => {
      mockRequest.payload = {}

      const response = await updateCertificationStatus.handler(mockRequest, mockH)

      expect(response.statusCode).toBe(400)
    })

    it('should use default user info when no auth credentials', async () => {
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'awaiting_decision' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: appliance
      })

      mockRequest.auth = null

      await updateCertificationStatus.handler(mockRequest, mockH)

      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.decidedBy).toBeDefined()
      expect(updateData.englandCertification.decidedBy.name).toBe('System')
    })
  })

  describe('route definition', () => {
    it('should have correct method', () => {
      expect(updateCertificationStatus.method).toBe('POST')
    })

    it('should have correct path', () => {
      expect(updateCertificationStatus.path).toBe('/appliances/{id}/certification/{country}')
    })

    it('should have tags', () => {
      expect(updateCertificationStatus.options.tags).toContain('api')
      expect(updateCertificationStatus.options.tags).toContain('appliances')
      expect(updateCertificationStatus.options.tags).toContain('certification')
    })

    it('should validate params', () => {
      expect(updateCertificationStatus.options.validate.params).toBeDefined()
    })

    it('should validate payload', () => {
      expect(updateCertificationStatus.options.validate.payload).toBeDefined()
    })
  })
})
