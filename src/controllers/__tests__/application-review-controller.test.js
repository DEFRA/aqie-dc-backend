import { beforeEach, describe, test, expect, vi } from 'vitest'
import {
  completeApplication,
  startApplication
} from '#src/controllers/application-review-controller.js'
import { calculateItemStatus } from '#src/common/helpers/item-status.js'

vi.mock('#src/common/helpers/item-status.js', () => ({
  calculateItemStatus: vi.fn()
}))

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
    let actionsCollection

    beforeEach(() => {
      vi.clearAllMocks()

      applicationsCollection = {
        findOne: vi.fn(),
        updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 })
      }

      itemsCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn()
        }),
        updateMany: vi.fn().mockResolvedValue({ matchedCount: 0 })
      }

      actionsCollection = {
        insertOne: vi.fn().mockResolvedValue({ acknowledged: true })
      }

      db = {
        collection: vi.fn((name) => {
          if (name === 'Applications') return applicationsCollection
          if (name === 'Actions') return actionsCollection
          return itemsCollection
        })
      }
    })

    const reviewedBy = { name: 'Jane Doe', email: 'jane.doe@example.com' }
    const reviewedItems = [
      { id: 'APP-A', technicalReview: { status: 'accepted' } },
      { id: 'APP-B', technicalReview: { status: 'rejected' } },
      { id: 'APP-C', technicalReview: { status: 'accepted' } }
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

    test('moves each still-new country certification to awaiting_decision', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      for (const field of [
        'englandCertification',
        'scotlandCertification',
        'walesCertification',
        'nIrelandCertification'
      ]) {
        expect(itemsCollection.updateMany).toHaveBeenCalledWith(
          { applicationId: 'app-1', id: { $in: ['APP-A', 'APP-C'] }, [`${field}.status`]: 'new' },
          { $set: { [`${field}.status`]: 'awaiting_decision' } }
        )
      }
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

    test('records "sent to governments" for each accepted item, by the system', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      const entries = actionsCollection.insertOne.mock.calls
        .map(([e]) => e)
        .filter((e) => e.action === 'sentToGovernments')
      expect(entries.map((e) => e.itemId).sort()).toEqual(['APP-A', 'APP-C'])
      for (const entry of entries) {
        expect(entry).toMatchObject({
          itemType: 'appliance',
          description: 'Sent to governments for approval',
          completedBy: { name: 'System', type: 'system' },
          completedAt: expect.any(Date)
        })
      }
    })

    test('records each item\'s review outcome against the reviewer', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      const outcomes = actionsCollection.insertOne.mock.calls
        .map(([e]) => e)
        .filter((e) => e.action !== 'sentToGovernments')
      expect(
        outcomes.map((e) => [e.itemId, e.action, e.description]).sort()
      ).toEqual([
        ['APP-A', 'acceptedAtApplication', 'Accepted at application'],
        ['APP-B', 'rejectedAtApplication', 'Rejected at application'],
        ['APP-C', 'acceptedAtApplication', 'Accepted at application']
      ])
      for (const entry of outcomes) {
        expect(entry.completedBy).toEqual({
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          type: 'user'
        })
      }
    })

    test('sends nothing to the governments when every item was rejected', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([
            { id: 'APP-B', technicalReview: { status: 'rejected' } }
          ])
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      const actions = actionsCollection.insertOne.mock.calls.map(
        ([e]) => e.action
      )
      expect(actions).toEqual(['rejectedAtApplication'])
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Email sent to DA')
      )
    })

    test('does not send a rejected item to the governments', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      const sentIds = actionsCollection.insertOne.mock.calls
        .map(([e]) => e)
        .filter((e) => e.action === 'sentToGovernments')
        .map((e) => e.itemId)
      expect(sentIds).not.toContain('APP-B')
    })

    test('records fuel items against the fuel type', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-2',
        type: 'fuel'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([
            { id: 'FUEL-1', technicalReview: { status: 'accepted' } }
          ])
      })

      await completeApplication(db, 'app-2', { reviewedBy }, mockLogger)

      expect(actionsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: 'FUEL-1', itemType: 'fuel' })
      )
    })

    test('does not repeat the history when the application is already complete', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance',
        status: 'complete'
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

      expect(result.success).toBe(true)
      expect(actionsCollection.insertOne).not.toHaveBeenCalled()
    })

    test('records nothing when the application cannot be completed yet', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([
            { id: 'APP-A', technicalReview: { status: 'in_review' } }
          ])
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      expect(actionsCollection.insertOne).not.toHaveBeenCalled()
    })

    test('still completes when the history cannot be written', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })
      actionsCollection.insertOne.mockRejectedValue(new Error('mongo down'))

      const result = await completeApplication(
        db,
        'app-1',
        { reviewedBy },
        mockLogger
      )

      expect(result.success).toBe(true)
    })

    test('recalculates the status of every linked item once the application is submitted', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      expect(calculateItemStatus).toHaveBeenCalledTimes(3)
      for (const id of ['APP-A', 'APP-B', 'APP-C']) {
        expect(calculateItemStatus).toHaveBeenCalledWith(db, 'appliance', id, {
          logger: mockLogger
        })
      }
    })

    test('recalculates only after the countries are awaiting a decision and the application is complete', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      const firstCalculation = calculateItemStatus.mock.invocationCallOrder[0]
      const lastCountryUpdate = Math.max(
        ...itemsCollection.updateMany.mock.invocationCallOrder
      )
      expect(lastCountryUpdate).toBeLessThan(firstCalculation)
      expect(
        applicationsCollection.updateOne.mock.invocationCallOrder[0]
      ).toBeLessThan(firstCalculation)
    })

    test('uses the fuel type when recalculating a fuel application', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-2',
        type: 'fuel'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([
            { id: 'FUEL-1', technicalReview: { status: 'accepted' } }
          ])
      })

      await completeApplication(db, 'app-2', { reviewedBy }, mockLogger)

      expect(calculateItemStatus).toHaveBeenCalledWith(db, 'fuel', 'FUEL-1', {
        logger: mockLogger
      })
    })

    test('does not recalculate when the application cannot be completed yet', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([
            { id: 'APP-A', technicalReview: { status: 'in_review' } }
          ])
      })

      await completeApplication(db, 'app-1', { reviewedBy }, mockLogger)

      expect(calculateItemStatus).not.toHaveBeenCalled()
    })

    test('still completes and logs when one item fails to recalculate', async () => {
      applicationsCollection.findOne.mockResolvedValue({
        id: 'app-1',
        type: 'appliance'
      })
      itemsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(reviewedItems)
      })
      calculateItemStatus.mockRejectedValueOnce(new Error('boom'))

      const result = await completeApplication(
        db,
        'app-1',
        { reviewedBy },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(calculateItemStatus).toHaveBeenCalledTimes(3)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to recalculate appliance status for APP-A: boom'
      )
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
