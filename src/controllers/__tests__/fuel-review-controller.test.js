import { describe, test, expect, beforeEach, vi } from 'vitest'

import { calculateItemStatus } from '#src/common/helpers/item-status.js'
import {
  recordFuelCheck,
  updateFuelReview
} from '#src/controllers/fuel-review-controller.js'

vi.mock('#src/common/helpers/item-status.js', () => ({
  calculateItemStatus: vi.fn()
}))

const rebrandPassed = {
  documentationChecks: { manufacturerLetter: true },
  listingChecks: { fuelDetails: true, fuelDescription: true }
}

const manufacturerPassed = {
  documentationChecks: { testResults: true },
  listingChecks: { fuelDetails: true }
}

describe('fuel-review-controller', () => {
  let db
  let collection
  let mockLogger

  beforeEach(() => {
    mockLogger = { info: vi.fn(), error: vi.fn() }
    collection = { findOne: vi.fn(), updateOne: vi.fn() }
    db = { collection: vi.fn().mockReturnValue(collection) }
  })

  describe('recordFuelCheck', () => {
    test('records a check and moves a new review to in_review', async () => {
      collection.findOne
        .mockResolvedValueOnce({
          supplierType: 'Rebrand',
          technicalReview: { status: 'new' }
        })
        .mockResolvedValueOnce({ id: 'FUEL-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      const result = await recordFuelCheck(
        db,
        'FUEL-1',
        'manufacturerLetter',
        true,
        mockLogger
      )

      expect(result).toEqual({
        success: true,
        data: { fuelId: 'FUEL-1', check: 'manufacturerLetter', result: true }
      })

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).toHaveProperty(
        'technicalReview.documentationChecks.manufacturerLetter',
        true
      )
      expect(update.$set).toHaveProperty('technicalReview.status', 'in_review')
    })

    test('writes listing checks under listingChecks', async () => {
      collection.findOne
        .mockResolvedValueOnce({
          supplierType: 'Rebrand',
          technicalReview: { status: 'in_review' }
        })
        .mockResolvedValueOnce({ id: 'FUEL-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      await recordFuelCheck(db, 'FUEL-1', 'fuelDetails', false, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).toHaveProperty(
        'technicalReview.listingChecks.fuelDetails',
        false
      )
      expect(update.$set).not.toHaveProperty('technicalReview.status')
    })

    test('does not change a decided review status', async () => {
      collection.findOne
        .mockResolvedValueOnce({
          supplierType: 'Rebrand',
          technicalReview: { status: 'accepted' }
        })
        .mockResolvedValueOnce({ id: 'FUEL-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      await recordFuelCheck(db, 'FUEL-1', 'fuelDescription', true, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).not.toHaveProperty('technicalReview.status')
    })

    test('rejects an unrecognised check', async () => {
      await expect(
        recordFuelCheck(db, 'FUEL-1', 'technicalDrawings', true, mockLogger)
      ).rejects.toThrow('Unrecognised check: technicalDrawings')
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('requires a boolean testResults result', async () => {
      await expect(
        recordFuelCheck(db, 'FUEL-1', 'testResults', null, mockLogger)
      ).rejects.toThrow('testResults result must be true')
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('records testResults for a Manufacturer fuel', async () => {
      collection.findOne
        .mockResolvedValueOnce({
          supplierType: 'Manufacture',
          technicalReview: { status: 'in_review' }
        })
        .mockResolvedValueOnce({ id: 'FUEL-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      await recordFuelCheck(db, 'FUEL-1', 'testResults', true, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).toHaveProperty(
        'technicalReview.documentationChecks.testResults',
        true
      )
    })

    test.each([
      ['Rebrand', 'testResults'],
      ['Manufacture', 'manufacturerLetter'],
      ['Manufacture', 'fuelDescription']
    ])(
      'rejects a check that does not apply to a %s fuel: %s',
      async (supplierType, check) => {
        collection.findOne.mockResolvedValue({
          supplierType,
          technicalReview: { status: 'new' }
        })

        await expect(
          recordFuelCheck(db, 'FUEL-1', check, true, mockLogger)
        ).rejects.toThrow(`${check} does not apply to a ${supplierType} fuel`)
        expect(collection.updateOne).not.toHaveBeenCalled()
      }
    )

    test('returns notFound when the fuel does not exist', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await recordFuelCheck(
        db,
        'missing',
        'fuelDetails',
        true,
        mockLogger
      )

      expect(result.notFound).toBe(true)
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('returns notFound when the update matches nothing', async () => {
      collection.findOne.mockResolvedValue({
        supplierType: 'Rebrand',
        technicalReview: {}
      })
      collection.updateOne.mockResolvedValue({ matchedCount: 0 })

      const result = await recordFuelCheck(
        db,
        'FUEL-1',
        'fuelDetails',
        true,
        mockLogger
      )

      expect(result.notFound).toBe(true)
    })

    test('throws when logger is missing', async () => {
      await expect(
        recordFuelCheck(db, 'FUEL-1', 'fuelDetails', true)
      ).rejects.toThrow('logger is required')
    })
  })

  describe('updateFuelReview', () => {
    const mockSuccessfulUpdate = (
      technicalReview = rebrandPassed,
      supplierType = 'Rebrand'
    ) => {
      collection.findOne
        .mockResolvedValueOnce({ supplierType, technicalReview })
        .mockResolvedValueOnce({ id: 'FUEL-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
    }

    test('accepts a Manufacturer fuel once its checks have passed', async () => {
      mockSuccessfulUpdate(manufacturerPassed, 'Manufacture')

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.success).toBe(true)
    })

    test('does not accept a Manufacturer fuel with Rebrand checks only', async () => {
      collection.findOne.mockResolvedValue({
        supplierType: 'Manufacture',
        technicalReview: rebrandPassed
      })

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.incomplete).toBe(true)
      expect(result.outstandingChecks).toEqual(['testResults'])
    })

    test('accepts when every check has passed', async () => {
      mockSuccessfulUpdate()

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

    test('refuses to accept while checks are outstanding', async () => {
      collection.findOne.mockResolvedValue({
        supplierType: 'Rebrand',
        technicalReview: {}
      })

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.incomplete).toBe(true)
      expect(result.outstandingChecks).toEqual([
        'manufacturerLetter',
        'fuelDetails',
        'fuelDescription'
      ])
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('refuses to accept when a check has failed', async () => {
      collection.findOne.mockResolvedValue({
        supplierType: 'Rebrand',
        technicalReview: {
          ...rebrandPassed,
          listingChecks: { ...rebrandPassed.listingChecks, fuelDetails: false }
        }
      })

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.incomplete).toBe(true)
      expect(result.outstandingChecks).toEqual(['fuelDetails'])
    })

    test('allows rejecting even when checks are outstanding', async () => {
      mockSuccessfulUpdate({})

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'rejected' },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('rejected')
    })

    test('writes dot-notation paths so the check results survive', async () => {
      mockSuccessfulUpdate()

      await updateFuelReview(db, 'FUEL-1', { status: 'accepted' }, mockLogger)

      const [filter, update] = collection.updateOne.mock.calls[0]

      expect(filter).toEqual({ id: 'FUEL-1' })
      expect(update.$set).toHaveProperty('technicalReview.status', 'accepted')
      expect(update.$set).toHaveProperty('technicalReview.reviewedAt')
      expect(update.$set).not.toHaveProperty('technicalReview')
      expect(update.$set).not.toHaveProperty(
        'technicalReview.documentationChecks'
      )
    })

    test('records the reviewer when one is supplied', async () => {
      mockSuccessfulUpdate()

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
      expect(calculateItemStatus).toHaveBeenCalledWith(db, 'fuel', 'FUEL-1')
    })

    test('records a null reviewer when nobody is signed in', async () => {
      mockSuccessfulUpdate()

      await updateFuelReview(db, 'FUEL-1', { status: 'accepted' }, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set['technicalReview.reviewedBy']).toBeNull()
    })

    test('does not return the full fuel record', async () => {
      mockSuccessfulUpdate()

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
      collection.findOne.mockResolvedValue(null)

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

    test('returns notFound when the update matches nothing', async () => {
      collection.findOne.mockResolvedValue({
        supplierType: 'Rebrand',
        technicalReview: rebrandPassed
      })
      collection.updateOne.mockResolvedValue({ matchedCount: 0 })

      const result = await updateFuelReview(
        db,
        'FUEL-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.notFound).toBe(true)
    })

    test('logs and rethrows database errors', async () => {
      const error = new Error('Database error')
      collection.findOne.mockRejectedValue(error)

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
