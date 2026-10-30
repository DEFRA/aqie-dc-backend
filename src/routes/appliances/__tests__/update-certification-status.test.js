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
        status: 'certified',
        decidedBy: { name: 'Test User', email: 'test@example.com' }
      },
      db: mockDb,
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn()
      }
    }
  })

  describe('handler', () => {
    it('should return 200 with updated appliance on success', async () => {
      const appliance = {
        id: 'APP-001',
        modelName: 'Test Stove',
        englandCertification: { status: 'awaiting_decision' }
      }
      const updated = {
        ...appliance,
        englandCertification: { status: 'certified' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockCollection.findOneAndUpdate.mockResolvedValueOnce(updated)

      const response = await updateCertificationStatus.handler(
        mockRequest,
        mockH
      )

      expect(mockH.response).toHaveBeenCalledWith({
        success: true,
        data: updated
      })
      expect(response.statusCode).toBe(200)
    })

    it('should validate country parameter', async () => {
      mockRequest.params.country = 'invalid-country'

      const response = await updateCertificationStatus.handler(
        mockRequest,
        mockH
      )

      expect(response.statusCode).toBe(400)
    })

    it('should reject an unsupported status', async () => {
      mockCollection.findOne.mockResolvedValueOnce({
        id: 'APP-001',
        englandCertification: { status: 'certified' }
      })
      mockRequest.payload.status = 'invalid-status'

      const response = await updateCertificationStatus.handler(
        mockRequest,
        mockH
      )

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 when appliance not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null)

      mockRequest.payload = {
        status: 'certified',
        decidedBy: { name: 'Test User', email: 'test@example.com' }
      }

      const response = await updateCertificationStatus.handler(
        mockRequest,
        mockH
      )

      expect(response.statusCode).toBe(404)
    })

    it('should return 400 for invalid status transition', async () => {
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'certified' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockRequest.payload.status = 'awaiting_decision' // Invalid transition from certified

      const response = await updateCertificationStatus.handler(
        mockRequest,
        mockH
      )

      expect(response.statusCode).toBe(400)
    })

    it('should store the decidedBy from the payload', async () => {
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'awaiting_decision' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        value: appliance
      })

      await updateCertificationStatus.handler(mockRequest, mockH)

      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.decidedBy).toEqual({
        name: 'Test User',
        email: 'test@example.com'
      })
    })

    it('should require decidedBy in payload', () => {
      const { error } =
        updateCertificationStatus.options.validate.payload.validate({
          status: 'certified'
        })

      expect(error).toBeDefined()
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

        const response = await updateCertificationStatus.handler(
          mockRequest,
          mockH
        )

        expect(response.statusCode).toBe(200)
      }
    })

    it('should return 500 on internal server error', async () => {
      mockCollection.findOne.mockRejectedValueOnce(new Error('Database error'))

      const response = await updateCertificationStatus.handler(
        mockRequest,
        mockH
      )

      expect(response.statusCode).toBe(500)
    })

    it('should store uncertified as-is', async () => {
      const appliance = {
        id: 'APP-001',
        englandCertification: { status: 'certified' }
      }

      mockCollection.findOne.mockResolvedValueOnce(appliance)
      mockCollection.findOneAndUpdate.mockResolvedValueOnce(appliance)

      mockRequest.payload.status = 'uncertified'

      const response = await updateCertificationStatus.handler(
        mockRequest,
        mockH
      )

      expect(response.statusCode).toBe(200)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.status).toBe('uncertified')
    })

    it('should require status in payload', () => {
      const { error } =
        updateCertificationStatus.options.validate.payload.validate({
          decidedBy: { name: 'Test User', email: 'test@example.com' }
        })

      expect(error).toBeDefined()
    })

    it('should return 500 when the controller throws', async () => {
      // controller guards throw rather than returning a result object
      mockRequest.db = null

      const response = await updateCertificationStatus.handler(
        mockRequest,
        mockH
      )

      expect(response.statusCode).toBe(500)
      expect(response.data.error.message).toBe('Internal server error')
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })

  describe('route definition', () => {
    it('should have correct method', () => {
      expect(updateCertificationStatus.method).toBe('PATCH')
    })

    it('should have correct path', () => {
      expect(updateCertificationStatus.path).toBe(
        '/appliances/{id}/certification/{country}'
      )
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
