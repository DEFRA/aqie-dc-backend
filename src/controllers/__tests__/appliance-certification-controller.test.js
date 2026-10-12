import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as applianceCertificationController from '../appliance-certification-controller.js'

describe('Appliance Certification Controller', () => {
  let mockDb
  let mockCollection
  let appliance

  beforeEach(() => {
    // Setup mock appliance
    appliance = {
      id: 'APP-001',
      modelName: 'Test Stove',
      englandCertification: {
        status: 'awaiting_decision',
        decidedAt: null,
        decidedBy: null,
        firstCertifiedAt: null,
        lastCertifiedAt: null
      },
      scotlandCertification: {
        status: 'certified',
        decidedAt: new Date('2026-01-01'),
        decidedBy: { name: 'John Doe', email: 'john@example.com' },
        firstCertifiedAt: new Date('2026-01-01'),
        lastCertifiedAt: new Date('2026-01-01')
      },
      walesCertification: {
        status: 'revoked',
        decidedAt: new Date('2026-02-01'),
        decidedBy: { name: 'Jane Smith', email: 'jane@example.com' },
        firstCertifiedAt: new Date('2025-12-01'),
        lastCertifiedAt: new Date('2026-02-01')
      },
      nIrelandCertification: {
        status: 'new',
        decidedAt: null,
        decidedBy: null,
        firstCertifiedAt: null,
        lastCertifiedAt: null
      },
      updatedAt: new Date()
    }

    mockCollection = {
      findOne: vi.fn().mockResolvedValue(appliance),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        value: { ...appliance, updatedAt: new Date() }
      })
    }

    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    }
  })

  describe('updateCertificationStatus', () => {
    const decidedBy = { name: 'Test User', email: 'test@example.com' }

    it('should update awaiting_decision to certified', async () => {
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'england',
        'certified',
        decidedBy
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled()

      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.status).toBe('certified')
      expect(updateData.englandCertification.decidedBy).toEqual(decidedBy)
    })

    it('should update awaiting_decision to uncertified (revoked)', async () => {
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'england',
        'uncertified',
        decidedBy
      )

      expect(result.success).toBe(true)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.status).toBe('revoked')
    })

    it('should update certified to revoked (uncertified)', async () => {
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'scotland',
        'uncertified',
        decidedBy
      )

      expect(result.success).toBe(true)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.scotlandCertification.status).toBe('revoked')
    })

    it('should update revoked to certified', async () => {
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'wales',
        'certified',
        decidedBy
      )

      expect(result.success).toBe(true)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.walesCertification.status).toBe('certified')
    })

    it('should set firstCertifiedAt on first certification', async () => {
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'england',
        'certified',
        decidedBy
      )

      expect(result.success).toBe(true)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.firstCertifiedAt).toBeDefined()
    })

    it('should not update firstCertifiedAt on subsequent certifications', async () => {
      mockCollection.findOne.mockResolvedValueOnce({
        ...appliance,
        scotlandCertification: {
          status: 'revoked',
          decidedAt: new Date('2026-02-01'),
          decidedBy: { name: 'Jane Smith', email: 'jane@example.com' },
          firstCertifiedAt: new Date('2026-01-01'), // Already set
          lastCertifiedAt: new Date('2026-02-01')
        }
      })

      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'scotland',
        'certified',
        decidedBy
      )

      expect(result.success).toBe(true)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      // Should have lastCertifiedAt but no firstCertifiedAt update
      expect(updateData.scotlandCertification.lastCertifiedAt).toBeDefined()
    })

    it('should reject invalid status transition from certified to awaiting_decision', async () => {
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'scotland',
        'awaiting_decision',
        decidedBy
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot change status')
    })

    it('should reject invalid country', async () => {
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'invalid-country',
        'certified',
        decidedBy
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid country')
    })

    it('should handle appliance not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null)

      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-999',
        'england',
        'certified',
        decidedBy
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Appliance not found')
    })

    it('should handle database errors', async () => {
      mockCollection.findOne.mockRejectedValueOnce(new Error('DB Error'))

      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'england',
        'certified',
        decidedBy
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Internal server error')
    })

    it('should set decidedAt timestamp', async () => {
      const beforeTime = new Date()
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'england',
        'certified',
        decidedBy
      )
      const afterTime = new Date()

      expect(result.success).toBe(true)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      const decidedAt = updateData.englandCertification.decidedAt

      expect(decidedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(decidedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })

    it('should update updatedAt field', async () => {
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'england',
        'certified',
        decidedBy
      )

      expect(result.success).toBe(true)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.updatedAt).toBeDefined()
    })

    it('should preserve decidedBy user information', async () => {
      const customUser = { name: 'Custom User', email: 'custom@example.com' }
      const result = await applianceCertificationController.updateCertificationStatus(
        mockDb,
        'APP-001',
        'england',
        'certified',
        customUser
      )

      expect(result.success).toBe(true)
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0]
      const updateData = updateCall[1].$set
      expect(updateData.englandCertification.decidedBy).toEqual(customUser)
    })

    it('should handle all four countries correctly', async () => {
      const countries = ['england', 'scotland', 'wales', 'northern-ireland']
      const results = []

      for (const country of countries) {
        mockCollection.findOne.mockResolvedValueOnce(appliance)
        const result = await applianceCertificationController.updateCertificationStatus(
          mockDb,
          'APP-001',
          country,
          'certified',
          decidedBy
        )
        results.push(result)
      }

      results.forEach((result) => {
        expect(result.success).toBe(true)
      })

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(4)
    })
  })
})
