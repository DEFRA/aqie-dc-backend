import { describe, test, expect, beforeEach, vi } from 'vitest'

import {
  getApplianceReview,
  updateApplianceReview,
  recordApplianceCheck
} from '#src/controllers/appliance-review-controller.js'

const allPassed = {
  documentationChecks: {
    testReports: true,
    technicalDrawings: true,
    conformityMark: true,
    instructionManual: true
  },
  listingChecks: {
    applianceDetails: true,
    permittedFuels: true,
    additionalConditions: true
  }
}

describe('appliance-review-controller', () => {
  let db
  let collection
  let mockLogger

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }

    collection = {
      findOne: vi.fn(),
      updateOne: vi.fn()
    }

    db = {
      collection: vi.fn().mockReturnValue(collection)
    }
  })

  describe('getApplianceReview', () => {
    test('returns the review state with outstanding checks', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-1',
        modelName: 'Twin Heat M20i',
        applicationId: '1084',
        technicalReview: {
          status: 'in_review',
          documentationChecks: { testReports: true }
        }
      })

      const result = await getApplianceReview(db, 'APP-1', mockLogger)

      expect(result.success).toBe(true)
      expect(result.data.modelName).toBe('Twin Heat M20i')
      expect(result.data.applicationId).toBe('1084')
      expect(result.data.outstandingChecks).toContain('technicalDrawings')
      expect(result.data.outstandingChecks).not.toContain('testReports')
    })

    test('returns no outstanding checks when the review is complete', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-1',
        technicalReview: allPassed
      })

      const result = await getApplianceReview(db, 'APP-1', mockLogger)

      expect(result.data.outstandingChecks).toEqual([])
    })

    test('does not project company contact details', async () => {
      collection.findOne.mockResolvedValue({ id: 'APP-1' })

      await getApplianceReview(db, 'APP-1', mockLogger)

      const [, options] = collection.findOne.mock.calls[0]

      expect(options.projection).toEqual({
        id: 1,
        modelName: 1,
        applicationId: 1,
        technicalReview: 1,
        _id: 0
      })
    })

    test('returns notFound when the appliance does not exist', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await getApplianceReview(db, 'missing', mockLogger)

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Appliance not found')
    })

    test('logs and rethrows on database failure', async () => {
      const error = new Error('Database error')
      collection.findOne.mockRejectedValue(error)

      await expect(getApplianceReview(db, 'APP-1', mockLogger)).rejects.toThrow(
        'Database error'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to fetch appliance review'
      )
    })

    test('throws when logger is missing', async () => {
      await expect(getApplianceReview(db, 'APP-1')).rejects.toThrow(
        'logger is required'
      )
    })
  })

  describe('updateApplianceReview', () => {
    test('accepts when every check has passed', async () => {
      collection.findOne
        .mockResolvedValueOnce({ technicalReview: allPassed })
        .mockResolvedValueOnce({ id: 'APP-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('accepted')
      expect(result.data.reviewedAt).toBeInstanceOf(Date)
    })

    test('refuses to accept while checks are outstanding', async () => {
      collection.findOne.mockResolvedValue({ technicalReview: {} })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.incomplete).toBe(true)
      expect(result.outstandingChecks).toContain('testReports')
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('refuses to accept when a check has failed', async () => {
      collection.findOne.mockResolvedValue({
        technicalReview: {
          ...allPassed,
          documentationChecks: {
            ...allPassed.documentationChecks,
            conformityMark: false
          }
        }
      })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.incomplete).toBe(true)
      expect(result.outstandingChecks).toEqual(['conformityMark'])
    })

    test('allows rejecting even when checks are outstanding', async () => {
      collection.findOne
        .mockResolvedValueOnce({ technicalReview: {} })
        .mockResolvedValueOnce({ id: 'APP-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        { status: 'rejected' },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('rejected')
    })

    test('writes dot-notation paths so the check results survive', async () => {
      collection.findOne
        .mockResolvedValueOnce({ technicalReview: allPassed })
        .mockResolvedValueOnce({ id: 'APP-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      await updateApplianceReview(
        db,
        'APP-1',
        { status: 'accepted' },
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty('technicalReview.status', 'accepted')
      expect(update.$set).toHaveProperty('technicalReview.reviewedAt')
      expect(update.$set).not.toHaveProperty('technicalReview')
      expect(update.$set).not.toHaveProperty(
        'technicalReview.documentationChecks'
      )
    })

    test('records the reviewer when one is supplied', async () => {
      collection.findOne
        .mockResolvedValueOnce({ technicalReview: allPassed })
        .mockResolvedValueOnce({ id: 'APP-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      await updateApplianceReview(
        db,
        'APP-1',
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
      collection.findOne
        .mockResolvedValueOnce({ technicalReview: allPassed })
        .mockResolvedValueOnce({ id: 'APP-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      await updateApplianceReview(
        db,
        'APP-1',
        { status: 'accepted' },
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set['technicalReview.reviewedBy']).toBeNull()
    })

    test('does not return the full appliance record', async () => {
      collection.findOne
        .mockResolvedValueOnce({ technicalReview: allPassed })
        .mockResolvedValueOnce({
          id: 'APP-1',
          companyContact: { email: 'applicant@example.com' }
        })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        { status: 'accepted' },
        mockLogger
      )

      expect(result.data).toEqual({
        id: 'APP-1',
        status: 'accepted',
        reviewedAt: expect.any(Date)
      })
    })

    test('returns notFound when the appliance does not exist', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await updateApplianceReview(
        db,
        'missing',
        { status: 'rejected' },
        mockLogger
      )

      expect(result.notFound).toBe(true)
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('logs and rethrows on database failure', async () => {
      const error = new Error('Database error')
      collection.findOne.mockRejectedValue(error)

      await expect(
        updateApplianceReview(db, 'APP-1', { status: 'rejected' }, mockLogger)
      ).rejects.toThrow('Database error')
      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to update appliance review'
      )
    })

    test('throws when logger is missing', async () => {
      await expect(
        updateApplianceReview(db, 'APP-1', { status: 'rejected' })
      ).rejects.toThrow('logger is required')
    })
  })

  describe('recordApplianceCheck', () => {
    function existingReview(status) {
      collection.findOne
        .mockResolvedValueOnce({ technicalReview: { status } })
        .mockResolvedValueOnce({ id: 'APP-1' })
      collection.updateOne.mockResolvedValue({ matchedCount: 1 })
    }

    test('records a documentation check as passed', async () => {
      existingReview('in_review')

      const result = await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        true,
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        id: 'APP-1',
        check: 'technicalDrawings',
        result: true
      })

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).toHaveProperty(
        'technicalReview.documentationChecks.technicalDrawings',
        true
      )
    })

    test('records a check as failed', async () => {
      existingReview('in_review')

      await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        false,
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]
      expect(
        update.$set['technicalReview.documentationChecks.technicalDrawings']
      ).toBe(false)
    })

    test('clears a check when the result is null', async () => {
      existingReview('in_review')

      await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        null,
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]
      expect(
        update.$set['technicalReview.documentationChecks.technicalDrawings']
      ).toBeNull()
    })

    test('routes a listing check to the right group', async () => {
      existingReview('in_review')

      await recordApplianceCheck(
        db,
        'APP-1',
        'permittedFuels',
        true,
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).toHaveProperty(
        'technicalReview.listingChecks.permittedFuels',
        true
      )
    })

    test('starts the review when the appliance is new', async () => {
      existingReview('new')

      await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        true,
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).toHaveProperty('technicalReview.status', 'in_review')
    })

    test('does not change the status once a review is in progress', async () => {
      existingReview('in_review')

      await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        true,
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).not.toHaveProperty('technicalReview.status')
    })

    test('does not undo a decision that has already been made', async () => {
      existingReview('accepted')

      await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        true,
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).not.toHaveProperty('technicalReview.status')
    })

    test('leaves the other checks untouched', async () => {
      existingReview('in_review')

      await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        true,
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]
      expect(update.$set).not.toHaveProperty('technicalReview')
      expect(update.$set).not.toHaveProperty(
        'technicalReview.documentationChecks'
      )
    })

    test('throws an unknown check name before touching the database', async () => {
      await expect(
        recordApplianceCheck(db, 'APP-1', 'something else', true, mockLogger)
      ).rejects.toThrow('Unrecognised check: something else')
      expect(collection.findOne).not.toHaveBeenCalled()
    })

    test('returns notFound when the appliance does not exist', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await recordApplianceCheck(
        db,
        'missing',
        'technicalDrawings',
        true,
        mockLogger
      )

      expect(result.notFound).toBe(true)
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('logs and rethrows on database failure', async () => {
      const error = new Error('Database error')
      collection.findOne.mockRejectedValue(error)

      await expect(
        recordApplianceCheck(db, 'APP-1', 'technicalDrawings', true, mockLogger)
      ).rejects.toThrow('Database error')
      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to record appliance check'
      )
    })

    test('throws when logger is missing', async () => {
      await expect(
        recordApplianceCheck(db, 'APP-1', 'technicalDrawings', true)
      ).rejects.toThrow('logger is required')
    })
  })
})
