import { beforeEach, describe, test, expect, vi } from 'vitest'
import {
  completeApplication,
  startApplication
} from '#src/controllers/application-review-controller.js'

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}

describe('application-review-controller', () => {
  describe('completeApplication', () => {
    let db
    let applicationsCollection
    let itemsCollection

    beforeEach(() => {
      vi.clearAllMocks()

      applicationsCollection = {
        findOne: vi.fn(),
        updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 })
      }

      itemsCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn()
        })
      }

      db = {
        collection: vi.fn((name) =>
          name === 'Applications' ? applicationsCollection : itemsCollection
        )
      }
    })

    const reviewedBy = { name: 'Jane Doe', email: 'jane.doe@example.com' }
    const reviewedItems = [
      { technicalReview: { status: 'accepted' } },
      { technicalReview: { status: 'rejected' } }
    ]

    test('returns notFound when the application does not exist', async () => {
      applicationsCollection.findOne.mockResolvedValue(null)

      const result = await completeApplication(
        db,
        'missing',
        { reviewedBy },
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Application not found')
    })

    test('returns incomplete when a linked item has not been reviewed', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([
            ...reviewedItems,
            { technicalReview: { status: 'in_review' } }
          ])
      })

      const result = await completeApplication(
        db,
        'app-1',
        { reviewedBy },
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.incomplete).toBe(true)
      expect(applicationsCollection.updateOne).not.toHaveBeenCalled()
    })

    test('completes an appliance application once every item has been reviewed', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })

      const result = await completeApplication(
        db,
        'app-1',
        { reviewedBy },
        mockLogger
      )

      expect(db.collection).toHaveBeenCalledWith('Appliances')
      expect(applicationsCollection.updateOne).toHaveBeenCalledWith(
        { id: 'app-1' },
        {
          $set: expect.objectContaining({
            status: 'complete',
            reviewedBy
          })
        }
      )
      expect(result.success).toBe(true)
      expect(result.data.status).toBe('complete')
      expect(result.data.reviewedBy).toEqual(reviewedBy)
    })

    test('checks linked fuels for fuel-type applications', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-2',
        type: 'fuel'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })

      await completeApplication(db, 'app-2', { reviewedBy }, mockLogger)

      expect(db.collection).toHaveBeenCalledWith('Fuels')
    })

    test('logs and rethrows on database failure', async () => {
      const error = new Error('Database error')
      applicationsCollection.findOne.mockRejectedValue(error)

      await expect(
        completeApplication(db, 'app-1', { reviewedBy }, mockLogger)
      ).rejects.toThrow('Database error')
      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to complete application'
      )
    })

    test('returns notFound for an unknown application type', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-3',
        type: 'unknown'
      })

      const result = await completeApplication(
        db,
        'app-3',
        { reviewedBy },
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Unknown application type: unknown')
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown application type: unknown'
      )
    })

    test('throws when logger is not provided', async () => {
      await expect(
        completeApplication(db, 'app-1', { reviewedBy }, null)
      ).rejects.toThrow('logger is required')
    })
  })

  describe('startApplication', () => {
    let db
    let applicationsCollection

    beforeEach(() => {
      vi.clearAllMocks()

      applicationsCollection = {
        findOne: vi.fn(),
        updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 })
      }

      db = {
        collection: vi.fn(() => applicationsCollection)
      }
    })

    const reviewedBy = { name: 'Jane Doe', email: 'jane.doe@example.com' }

    test('returns notFound when the application does not exist', async () => {
      applicationsCollection.findOne.mockResolvedValue(null)

      const result = await startApplication(
        db,
        'missing',
        { reviewedBy },
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Application not found')
      expect(applicationsCollection.updateOne).not.toHaveBeenCalled()
    })

    test('sets an application to in progress', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })

      const result = await startApplication(
        db,
        'app-1',
        { reviewedBy },
        mockLogger
      )

      expect(applicationsCollection.updateOne).toHaveBeenCalledWith(
        { id: 'app-1' },
        {
          $set: expect.objectContaining({
            status: 'in_progress',
            reviewedBy
          })
        }
      )
      expect(result.success).toBe(true)
      expect(result.data.status).toBe('in_progress')
      expect(result.data.reviewedBy).toEqual(reviewedBy)
    })

    test('logs and rethrows on database failure', async () => {
      const error = new Error('Database error')
      applicationsCollection.findOne.mockRejectedValue(error)

      await expect(
        startApplication(db, 'app-1', { reviewedBy }, mockLogger)
      ).rejects.toThrow('Database error')
      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to set application to in progress'
      )
    })

    test('throws when logger is not provided', async () => {
      await expect(
        startApplication(db, 'app-1', { reviewedBy }, null)
      ).rejects.toThrow('logger is required')
    })
  })
})
