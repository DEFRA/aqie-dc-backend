import { describe, test, expect, beforeEach, vi } from 'vitest'

import { updateFuelReview } from '#src/controllers/fuel-review-controller.js'

describe('fuel-review-controller', () => {
  let db
  let collection
  let mockLogger

  beforeEach(() => {
    mockLogger = { info: vi.fn(), error: vi.fn() }
    collection = { findOne: vi.fn(), updateOne: vi.fn() }
    db = { collection: vi.fn().mockReturnValue(collection) }
  })

  describe('updateFuelReview', () => {
    test('records an accepted decision', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({ fuelId: 'FUEL-1' })

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.fuelId).toBe('FUEL-1')
      expect(result.data.status).toBe('accepted')
      expect(result.data.reviewedAt).toBeInstanceOf(Date)
      expect(db.collection).toHaveBeenCalledWith('Fuels')
    })

    test('records a rejected decision', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({ fuelId: 'FUEL-1' })

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'rejected' },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('rejected')
    })

    test('writes dot-notation paths so other review fields survive', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({ fuelId: 'FUEL-1' })

      await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      const [filter, update] = collection.updateOne.mock.calls[0]

      expect(filter).toEqual({ fuelId: 'FUEL-1' })
      expect(update.$set).toHaveProperty('technicalReview.status', 'accepted')
      expect(update.$set).toHaveProperty('technicalReview.reviewedAt')
      expect(update.$set).not.toHaveProperty('technicalReview')
    })

    test('records the reviewer when one is supplied', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({ fuelId: 'FUEL-1' })

      await updateFuelReview(
        db,
        'FUEL-1',
        {
          status: 'accepted',
          reviewedBy: { name: 'A Reviewer', email: 'a@defra.gov.uk' }
        },
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set['technicalReview.reviewedBy.name']).toBe('A Reviewer')
      expect(update.$set['technicalReview.reviewedBy.email']).toBe(
        'a@defra.gov.uk'
      )
    })

    test('records a null reviewer when nobody is signed in', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({ fuelId: 'FUEL-1' })

      await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set['technicalReview.reviewedBy']).toBeNull()
    })

    test('does not return the full fuel record', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
      collection.findOne.mockResolvedValue({
        fuelId: 'FUEL-1',
        companyContact: { email: 'private@example.com' }
      })

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(Object.keys(result.data).sort()).toEqual([
        'fuelId',
        'reviewedAt',
        'status'
      ])
    })

    test('returns notFound when the fuel does not exist', async () => {
      collection.updateOne.mockResolvedValue({ matchedCount: 0 })

      const result = await updateFuelReview(
        db,
        'missing',
        { status: 'accepted' },
        mockLogger
      )

      expect(result).toEqual({
        success: false,
        message: 'Fuel not found',
        notFound: true
      })
    })

    test('logs and rethrows database errors', async () => {
      const error = new Error('Database error')
      collection.updateOne.mockRejectedValue(error)

      await expect(
        updateFuelReview(db, 'FUEL-1', { status: 'accepted' }, mockLogger)
      ).rejects.toThrow('Database error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to update fuel review'
      )
    })

    test('throws when logger is missing', async () => {
      await expect(
        updateFuelReview(db, 'FUEL-1', { status: 'accepted' })
      ).rejects.toThrow('logger is required')
    })
  })
})
