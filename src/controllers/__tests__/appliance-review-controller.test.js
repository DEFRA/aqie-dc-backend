import { describe, test, expect, beforeEach, vi } from 'vitest'

import {
  getApplianceReview,
  updateApplianceReview,
  recordApplianceCheck,
  getTestReport,
  updateTestReport
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
          documentationChecks: {
            testReports: true
          }
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
      collection.findOne.mockResolvedValue({
        id: 'APP-1'
      })

      await getApplianceReview(db, 'APP-1', mockLogger)

      const [, options] = collection.findOne.mock.calls[0]

      expect(options.projection).toEqual({
        id: 1,
        modelName: 1,
        modelNumber: 1,
        applicationId: 1,
        applianceType: 1,
        isVariant: 1,
        existingAuthorisedAppliance: 1,
        nominalOutput: 1,
        multifuelAppliance: 1,
        permittedFuels: 1,
        additionalConditions: 1,
        isPermittedToBurnWood: 1,
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
        .mockResolvedValueOnce({
          technicalReview: allPassed
        })
        .mockResolvedValueOnce({
          id: 'APP-1'
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        {
          status: 'accepted'
        },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('accepted')
      expect(result.data.reviewedAt).toBeInstanceOf(Date)
    })

    test('refuses to accept while checks are outstanding', async () => {
      collection.findOne.mockResolvedValue({
        technicalReview: {}
      })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        {
          status: 'accepted'
        },
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
        {
          status: 'accepted'
        },
        mockLogger
      )

      expect(result.incomplete).toBe(true)
      expect(result.outstandingChecks).toContain('conformityMark')
    })

    test('allows rejecting even when checks are outstanding', async () => {
      collection.findOne
        .mockResolvedValueOnce({
          technicalReview: {}
        })
        .mockResolvedValueOnce({
          id: 'APP-1'
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        {
          status: 'rejected'
        },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('rejected')
    })

    test('writes dot-notation paths so the check results survive', async () => {
      collection.findOne
        .mockResolvedValueOnce({
          technicalReview: allPassed
        })
        .mockResolvedValueOnce({
          id: 'APP-1'
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })

      await updateApplianceReview(
        db,
        'APP-1',
        {
          status: 'accepted'
        },
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
        .mockResolvedValueOnce({
          technicalReview: allPassed
        })
        .mockResolvedValueOnce({
          id: 'APP-1'
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })

      await updateApplianceReview(
        db,
        'APP-1',
        {
          status: 'accepted',
          reviewedBy: {
            name: 'A Reviewer',
            email: 'a@defra.gov.uk'
          }
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
        .mockResolvedValueOnce({
          technicalReview: allPassed
        })
        .mockResolvedValueOnce({
          id: 'APP-1'
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })

      await updateApplianceReview(
        db,
        'APP-1',
        {
          status: 'accepted'
        },
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set['technicalReview.reviewedBy']).toBeNull()
    })

    test('does not return the full appliance record', async () => {
      collection.findOne
        .mockResolvedValueOnce({
          technicalReview: allPassed
        })
        .mockResolvedValueOnce({
          id: 'APP-1',
          companyContact: {
            email: 'applicant@example.com'
          }
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        {
          status: 'accepted'
        },
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
        {
          status: 'rejected'
        },
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Appliance not found')
      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('returns notFound when update step cannot find appliance', async () => {
      collection.findOne.mockResolvedValueOnce({
        technicalReview: allPassed
      })

      collection.updateOne.mockResolvedValue({
        matchedCount: 0
      })

      const result = await updateApplianceReview(
        db,
        'APP-1',
        {
          status: 'accepted'
        },
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Appliance not found')
    })

    test('logs and rethrows on database failure', async () => {
      const error = new Error('Database error')

      collection.findOne.mockRejectedValue(error)

      await expect(
        updateApplianceReview(
          db,
          'APP-1',
          {
            status: 'rejected'
          },
          mockLogger
        )
      ).rejects.toThrow('Database error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to update appliance review'
      )
    })

    test('throws when logger is missing', async () => {
      await expect(
        updateApplianceReview(db, 'APP-1', {
          status: 'rejected'
        })
      ).rejects.toThrow('logger is required')
    })
  })

  describe('recordApplianceCheck', () => {
    function existingReview(status) {
      collection.findOne
        .mockResolvedValueOnce({
          technicalReview: {
            status
          }
        })
        .mockResolvedValueOnce({
          id: 'APP-1'
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })
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

      expect(collection.updateOne).toHaveBeenCalledTimes(1)

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
        'applianceDetails',
        true,
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty(
        'technicalReview.listingChecks.applianceDetails',
        true
      )
    })

    test('writes permitted fuels fields when provided', async () => {
      existingReview('in_review')

      await recordApplianceCheck(
        db,
        'APP-1',
        'permittedFuels',
        true,
        mockLogger,
        {
          permittedFuels: 'Wood logs',
          isPermittedToBurnWood: false
        }
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty('permittedFuels', 'Wood logs')
      expect(update.$set).toHaveProperty('isPermittedToBurnWood', false)
      expect(update.$set).toHaveProperty(
        'technicalReview.listingChecks.permittedFuels',
        true
      )
    })

    describe('additionalConditions check', () => {
      test('accepts result true with valid text', async () => {
        existingReview('in_review')

        const result = await recordApplianceCheck(
          db,
          'APP-1',
          'additionalConditions',
          true,
          mockLogger,
          {
            additionalConditions: 'Standard additional condition text'
          }
        )

        expect(result).toEqual({
          success: true,
          data: {
            id: 'APP-1',
            check: 'additionalConditions',
            result: true
          }
        })

        expect(collection.updateOne).toHaveBeenCalledTimes(1)

        const [, update] = collection.updateOne.mock.calls[0]

        expect(update.$set).toHaveProperty(
          'additionalConditions',
          'Standard additional condition text'
        )
        expect(update.$set).toHaveProperty(
          'technicalReview.listingChecks.additionalConditions',
          true
        )
      })

      test('allows existing additional conditions text to be edited', async () => {
        collection.findOne
          .mockResolvedValueOnce({
            additionalConditions: 'Original additional condition text',
            technicalReview: {
              status: 'in_review',
              listingChecks: {
                additionalConditions: true
              }
            }
          })
          .mockResolvedValueOnce({
            id: 'APP-1',
            additionalConditions: 'Edited additional condition text'
          })

        collection.updateOne.mockResolvedValue({
          matchedCount: 1
        })

        const result = await recordApplianceCheck(
          db,
          'APP-1',
          'additionalConditions',
          true,
          mockLogger,
          {
            additionalConditions: 'Edited additional condition text'
          }
        )

        expect(result).toEqual({
          success: true,
          data: {
            id: 'APP-1',
            check: 'additionalConditions',
            result: true
          }
        })

        expect(collection.updateOne).toHaveBeenCalledTimes(1)

        const [, update] = collection.updateOne.mock.calls[0]

        expect(update.$set).toHaveProperty(
          'additionalConditions',
          'Edited additional condition text'
        )
        expect(update.$set).toHaveProperty(
          'technicalReview.listingChecks.additionalConditions',
          true
        )
        expect(update.$set).not.toHaveProperty('technicalReview.status')
      })

      test.each([
        ['an empty string', ''],
        ['whitespace-only text', '   ']
      ])(
        'rejects %s for additional conditions',
        async (_, additionalConditions) => {
          await expect(
            recordApplianceCheck(
              db,
              'APP-1',
              'additionalConditions',
              true,
              mockLogger,
              {
                additionalConditions
              }
            )
          ).rejects.toMatchObject({
            isBoom: true,
            output: {
              statusCode: 400,
              payload: expect.objectContaining({
                message:
                  'Additional conditions must be marked complete and include text'
              })
            }
          })

          expect(collection.findOne).not.toHaveBeenCalled()
          expect(collection.updateOne).not.toHaveBeenCalled()

          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
              isBoom: true
            }),
            'Failed to record appliance check'
          )
        }
      )

      test('rejects missing text for additional conditions', async () => {
        await expect(
          recordApplianceCheck(
            db,
            'APP-1',
            'additionalConditions',
            true,
            mockLogger,
            {}
          )
        ).rejects.toMatchObject({
          isBoom: true,
          output: {
            statusCode: 400,
            payload: expect.objectContaining({
              message:
                'Additional conditions must be marked complete and include text'
            })
          }
        })

        expect(collection.findOne).not.toHaveBeenCalled()
        expect(collection.updateOne).not.toHaveBeenCalled()
      })

      test('rejects missing additional conditions data', async () => {
        await expect(
          recordApplianceCheck(
            db,
            'APP-1',
            'additionalConditions',
            true,
            mockLogger
          )
        ).rejects.toMatchObject({
          isBoom: true,
          output: {
            statusCode: 400,
            payload: expect.objectContaining({
              message:
                'Additional conditions must be marked complete and include text'
            })
          }
        })

        expect(collection.findOne).not.toHaveBeenCalled()
        expect(collection.updateOne).not.toHaveBeenCalled()
      })

      test('rejects result false even when text is valid', async () => {
        await expect(
          recordApplianceCheck(
            db,
            'APP-1',
            'additionalConditions',
            false,
            mockLogger,
            {
              additionalConditions: 'Valid additional condition text'
            }
          )
        ).rejects.toMatchObject({
          isBoom: true,
          output: {
            statusCode: 400,
            payload: expect.objectContaining({
              message:
                'Additional conditions must be marked complete and include text'
            })
          }
        })

        expect(collection.findOne).not.toHaveBeenCalled()
        expect(collection.updateOne).not.toHaveBeenCalled()
      })

      test('rejects result null even when text is valid', async () => {
        await expect(
          recordApplianceCheck(
            db,
            'APP-1',
            'additionalConditions',
            null,
            mockLogger,
            {
              additionalConditions: 'Valid additional condition text'
            }
          )
        ).rejects.toMatchObject({
          isBoom: true,
          output: {
            statusCode: 400,
            payload: expect.objectContaining({
              message:
                'Additional conditions must be marked complete and include text'
            })
          }
        })

        expect(collection.findOne).not.toHaveBeenCalled()
        expect(collection.updateOne).not.toHaveBeenCalled()
      })

      test('starts a new review when valid additional conditions are saved', async () => {
        existingReview('new')

        await recordApplianceCheck(
          db,
          'APP-1',
          'additionalConditions',
          true,
          mockLogger,
          {
            additionalConditions: 'Valid additional condition text'
          }
        )

        expect(collection.updateOne).toHaveBeenCalledTimes(1)

        const [, update] = collection.updateOne.mock.calls[0]

        expect(update.$set).toHaveProperty(
          'additionalConditions',
          'Valid additional condition text'
        )
        expect(update.$set).toHaveProperty(
          'technicalReview.listingChecks.additionalConditions',
          true
        )
        expect(update.$set).toHaveProperty(
          'technicalReview.status',
          'in_review'
        )
      })
    })

    test('ignores payload data when the caller does not supply any', async () => {
      collection.findOne
        .mockResolvedValueOnce({
          technicalReview: {
            status: 'in_review'
          }
        })
        .mockResolvedValueOnce({
          id: 'APP-1'
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })

      await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        true,
        mockLogger,
        undefined
      )

      expect(collection.updateOne).toHaveBeenCalledTimes(1)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty(
        'technicalReview.documentationChecks.technicalDrawings',
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
      expect(collection.updateOne).not.toHaveBeenCalled()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to record appliance check'
      )
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

      expect(result).toEqual({
        success: false,
        message: 'Appliance not found',
        notFound: true
      })

      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('returns notFound when update step cannot find appliance', async () => {
      collection.findOne.mockResolvedValueOnce({
        technicalReview: {}
      })

      collection.updateOne.mockResolvedValue({
        matchedCount: 0
      })

      const result = await recordApplianceCheck(
        db,
        'APP-1',
        'technicalDrawings',
        true,
        mockLogger
      )

      expect(result.success).toBe(false)
      expect(result.notFound).toBe(true)
      expect(result.message).toBe('Appliance not found')
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

  describe('getTestReport', () => {
    test('returns test-report values and review status', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-1',
        testResults: {
          ratedOutput: 5.2,
          testedOutput: {
            rated: 5.1,
            low: 2.4
          },
          smokeEmissionOutput: {
            rated: 3.1,
            low: 2.2
          }
        },
        technicalReview: {
          documentationChecks: {
            testReports: true
          }
        }
      })

      const result = await getTestReport(db, 'APP-1', mockLogger)

      expect(result).toEqual({
        success: true,
        data: {
          id: 'APP-1',
          ratedOutput: 5.2,
          testedOutput: {
            rated: 5.1,
            low: 2.4
          },
          smokeEmissionOutput: {
            rated: 3.1,
            low: 2.2
          },
          reviewStatus: true
        }
      })
    })

    test('returns previously saved failed values for editing', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-1',
        testResults: {
          ratedOutput: 'abc',
          testedOutput: {
            rated: '-10.567',
            low: 'ABC123'
          },
          smokeEmissionOutput: {
            rated: '',
            low: '1abc'
          }
        },
        technicalReview: {
          documentationChecks: {
            testReports: false
          }
        }
      })

      const result = await getTestReport(db, 'APP-1', mockLogger)

      expect(result).toEqual({
        success: true,
        data: {
          id: 'APP-1',
          ratedOutput: 'abc',
          testedOutput: {
            rated: '-10.567',
            low: 'ABC123'
          },
          smokeEmissionOutput: {
            rated: '',
            low: '1abc'
          },
          reviewStatus: false
        }
      })
    })

    test('returns null defaults when test-report values have not been recorded', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-1'
      })

      const result = await getTestReport(db, 'APP-1', mockLogger)

      expect(result.data).toEqual({
        id: 'APP-1',
        ratedOutput: null,
        testedOutput: {
          rated: null,
          low: null
        },
        smokeEmissionOutput: {
          rated: null,
          low: null
        },
        reviewStatus: null
      })
    })

    test('requests only fields required by the test-report screen', async () => {
      collection.findOne.mockResolvedValue({
        id: 'APP-1'
      })

      await getTestReport(db, 'APP-1', mockLogger)

      expect(collection.findOne).toHaveBeenCalledWith(
        { id: 'APP-1' },
        {
          projection: {
            id: 1,
            modelName: 1,
            testResults: 1,
            'technicalReview.documentationChecks.testReports': 1,
            _id: 0
          }
        }
      )
    })

    test('returns notFound when the appliance does not exist', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await getTestReport(db, 'missing', mockLogger)

      expect(result).toEqual({
        success: false,
        message: 'Appliance not found',
        notFound: true
      })
    })

    test('logs and rethrows database errors', async () => {
      const error = new Error('Database error')
      collection.findOne.mockRejectedValue(error)

      await expect(getTestReport(db, 'APP-1', mockLogger)).rejects.toThrow(
        'Database error'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to fetch appliance test reports'
      )
    })

    test('throws when logger is missing', async () => {
      await expect(getTestReport(db, 'APP-1')).rejects.toThrow(
        'logger is required'
      )
    })
  })

  describe('updateTestReport', () => {
    const testReport = {
      ratedOutput: 5.2,
      testedOutput: {
        rated: 5.1,
        low: 2.4
      },
      smokeEmissionOutput: {
        rated: 3.1,
        low: 2.2
      },
      reviewStatus: true
    }

    function existingReview(status) {
      collection.findOne
        .mockResolvedValueOnce({
          technicalReview: { status }
        })
        .mockResolvedValueOnce({
          id: 'APP-1'
        })

      collection.updateOne.mockResolvedValue({
        matchedCount: 1
      })
    }

    test('rounds passed values to two decimal places', async () => {
      existingReview('in_review')

      const passedTestReport = {
        reviewStatus: true,
        ratedOutput: 5.678,

        testedOutput: {
          rated: 5.124,
          low: 2.555
        },

        smokeEmissionOutput: {
          rated: 3.999,
          low: 1.005
        }
      }

      const result = await updateTestReport(
        db,
        'APP-1',
        passedTestReport,
        mockLogger
      )

      expect(result).toEqual({
        success: true,

        data: {
          id: 'APP-1',
          reviewStatus: true,
          ratedOutput: 5.68,

          testedOutput: {
            rated: 5.12,
            low: 2.56
          },

          smokeEmissionOutput: {
            rated: 4,
            low: 1.01
          }
        }
      })

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toMatchObject({
        'testResults.ratedOutput': 5.68,

        'testResults.testedOutput.rated': 5.12,

        'testResults.testedOutput.low': 2.56,

        'testResults.smokeEmissionOutput.rated': 4,

        'testResults.smokeEmissionOutput.low': 1.01,

        'technicalReview.documentationChecks.testReports': true
      })
    })

    test('does not change passed values that already have two decimal places', async () => {
      existingReview('in_review')

      const passedTestReport = {
        reviewStatus: true,
        ratedOutput: 5.25,

        testedOutput: {
          rated: 4.5,
          low: 2
        },

        smokeEmissionOutput: {
          rated: 3.75,
          low: 1.1
        }
      }

      const result = await updateTestReport(
        db,
        'APP-1',
        passedTestReport,
        mockLogger
      )

      expect(result.data).toEqual({
        id: 'APP-1',
        reviewStatus: true,
        ratedOutput: 5.25,

        testedOutput: {
          rated: 4.5,
          low: 2
        },

        smokeEmissionOutput: {
          rated: 3.75,
          low: 1.1
        }
      })
    })

    test('does not round numeric strings when the review is failed', async () => {
      existingReview('in_review')

      const failedTestReport = {
        reviewStatus: false,
        ratedOutput: '5.678',

        testedOutput: {
          rated: '-10.567',
          low: '2.555'
        },

        smokeEmissionOutput: {
          rated: '3.999',
          low: '1.005'
        }
      }

      const result = await updateTestReport(
        db,
        'APP-1',
        failedTestReport,
        mockLogger
      )

      expect(result.data).toEqual({
        id: 'APP-1',
        reviewStatus: false,
        ratedOutput: '5.678',

        testedOutput: {
          rated: '-10.567',
          low: '2.555'
        },

        smokeEmissionOutput: {
          rated: '3.999',
          low: '1.005'
        }
      })

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toMatchObject({
        'testResults.ratedOutput': '5.678',

        'testResults.testedOutput.rated': '-10.567',

        'testResults.testedOutput.low': '2.555',

        'testResults.smokeEmissionOutput.rated': '3.999',

        'testResults.smokeEmissionOutput.low': '1.005',

        'technicalReview.documentationChecks.testReports': false
      })
    })

    test('preserves empty strings when the review is failed', async () => {
      existingReview('in_review')

      const failedTestReport = {
        reviewStatus: false,
        ratedOutput: '',

        testedOutput: {
          rated: '',
          low: ''
        },

        smokeEmissionOutput: {
          rated: '',
          low: ''
        }
      }

      const result = await updateTestReport(
        db,
        'APP-1',
        failedTestReport,
        mockLogger
      )

      expect(result.data).toEqual({
        id: 'APP-1',
        reviewStatus: false,
        ratedOutput: '',

        testedOutput: {
          rated: '',
          low: ''
        },

        smokeEmissionOutput: {
          rated: '',
          low: ''
        }
      })

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toMatchObject({
        'testResults.ratedOutput': '',

        'testResults.testedOutput.rated': '',

        'testResults.testedOutput.low': '',

        'testResults.smokeEmissionOutput.rated': '',

        'testResults.smokeEmissionOutput.low': '',

        'technicalReview.documentationChecks.testReports': false
      })
    })

    test('does not mutate the original passed test-report object', async () => {
      existingReview('in_review')

      const passedTestReport = {
        reviewStatus: true,
        ratedOutput: 5.678,

        testedOutput: {
          rated: 5.124,
          low: 2.555
        },

        smokeEmissionOutput: {
          rated: 3.999,
          low: 1.005
        }
      }

      const originalTestReport = structuredClone(passedTestReport)

      await updateTestReport(db, 'APP-1', passedTestReport, mockLogger)

      expect(passedTestReport).toEqual(originalTestReport)
    })

    test('converts passed numeric strings to rounded numbers', async () => {
      existingReview('in_review')

      const passedTestReport = {
        reviewStatus: true,
        ratedOutput: '5.678',

        testedOutput: {
          rated: '5.124',
          low: '2.555'
        },

        smokeEmissionOutput: {
          rated: '3.999',
          low: '1.005'
        }
      }

      const result = await updateTestReport(
        db,
        'APP-1',
        passedTestReport,
        mockLogger
      )

      expect(result.data).toEqual({
        id: 'APP-1',
        reviewStatus: true,
        ratedOutput: 5.68,

        testedOutput: {
          rated: 5.12,
          low: 2.56
        },

        smokeEmissionOutput: {
          rated: 4,
          low: 1.01
        }
      })

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set['testResults.ratedOutput']).toBe(5.68)

      expect(typeof update.$set['testResults.ratedOutput']).toBe('number')
    })

    test('records a failed review with null measurements', async () => {
      existingReview('in_review')

      const failedTestReport = {
        reviewStatus: false,
        ratedOutput: null,
        testedOutput: {
          rated: null,
          low: null
        },
        smokeEmissionOutput: {
          rated: null,
          low: null
        }
      }

      const result = await updateTestReport(
        db,
        'APP-1',
        failedTestReport,
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.reviewStatus).toBe(false)
      expect(result.data.ratedOutput).toBeNull()
      expect(result.data.testedOutput.rated).toBeNull()
      expect(result.data.testedOutput.low).toBeNull()
      expect(result.data.smokeEmissionOutput.rated).toBeNull()
      expect(result.data.smokeEmissionOutput.low).toBeNull()

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty(
        'technicalReview.documentationChecks.testReports',
        false
      )

      expect(update.$set).toHaveProperty('testResults.ratedOutput', null)
    })

    test('records zero values without changing them', async () => {
      existingReview('in_review')

      const zeroTestReport = {
        reviewStatus: true,
        ratedOutput: 0,
        testedOutput: {
          rated: 0,
          low: 0
        },
        smokeEmissionOutput: {
          rated: 0,
          low: 0
        }
      }

      const result = await updateTestReport(
        db,
        'APP-1',
        zeroTestReport,
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data.ratedOutput).toBe(0)
      expect(result.data.testedOutput.rated).toBe(0)
      expect(result.data.testedOutput.low).toBe(0)
      expect(result.data.smokeEmissionOutput.rated).toBe(0)
      expect(result.data.smokeEmissionOutput.low).toBe(0)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty('testResults.ratedOutput', 0)

      expect(update.$set).toHaveProperty(
        'technicalReview.documentationChecks.testReports',
        true
      )
    })

    test('records all submitted values when the review is failed', async () => {
      existingReview('in_review')

      const failedTestReport = {
        reviewStatus: false,
        ratedOutput: 'abc',
        testedOutput: {
          rated: '-10.567',
          low: 'ABC123'
        },
        smokeEmissionOutput: {
          rated: '',
          low: '1abc'
        }
      }

      const result = await updateTestReport(
        db,
        'APP-1',
        failedTestReport,
        mockLogger
      )

      expect(result).toEqual({
        success: true,
        data: {
          id: 'APP-1',
          ratedOutput: 'abc',
          testedOutput: {
            rated: '-10.567',
            low: 'ABC123'
          },
          smokeEmissionOutput: {
            rated: '',
            low: '1abc'
          },
          reviewStatus: false
        }
      })

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty('testResults.ratedOutput', 'abc')

      expect(update.$set).toHaveProperty(
        'testResults.testedOutput.rated',
        '-10.567'
      )

      expect(update.$set).toHaveProperty(
        'testResults.testedOutput.low',
        'ABC123'
      )

      expect(update.$set).toHaveProperty(
        'testResults.smokeEmissionOutput.rated',
        ''
      )

      expect(update.$set).toHaveProperty(
        'testResults.smokeEmissionOutput.low',
        '1abc'
      )

      expect(update.$set).toHaveProperty(
        'technicalReview.documentationChecks.testReports',
        false
      )
    })

    test('replaces existing test-report values when a failed review is edited', async () => {
      existingReview('in_review')

      const editedTestReport = {
        reviewStatus: false,
        ratedOutput: '-5',
        testedOutput: {
          rated: 'edited value',
          low: ''
        },
        smokeEmissionOutput: {
          rated: 'ABC123',
          low: '0'
        }
      }

      await updateTestReport(db, 'APP-1', editedTestReport, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toMatchObject({
        'testResults.ratedOutput': '-5',
        'testResults.testedOutput.rated': 'edited value',
        'testResults.testedOutput.low': '',
        'testResults.smokeEmissionOutput.rated': 'ABC123',
        'testResults.smokeEmissionOutput.low': '0',
        'technicalReview.documentationChecks.testReports': false
      })
    })

    test('updates test-report values and review status', async () => {
      existingReview('in_review')

      const result = await updateTestReport(db, 'APP-1', testReport, mockLogger)

      expect(result).toEqual({
        success: true,
        data: {
          id: 'APP-1',
          ...testReport
        }
      })

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty('testResults.ratedOutput', 5.2)
      expect(update.$set).toHaveProperty('testResults.testedOutput.rated', 5.1)
      expect(update.$set).toHaveProperty('testResults.testedOutput.low', 2.4)
      expect(update.$set).toHaveProperty(
        'testResults.smokeEmissionOutput.rated',
        3.1
      )
      expect(update.$set).toHaveProperty(
        'testResults.smokeEmissionOutput.low',
        2.2
      )
      expect(update.$set).toHaveProperty(
        'technicalReview.documentationChecks.testReports',
        true
      )
    })

    test('starts the technical review when its current status is new', async () => {
      existingReview('new')

      await updateTestReport(db, 'APP-1', testReport, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).toHaveProperty('technicalReview.status', 'in_review')
    })

    test('does not change an existing technical review status', async () => {
      existingReview('in_review')

      await updateTestReport(db, 'APP-1', testReport, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).not.toHaveProperty('technicalReview.status')
    })

    test('does not overwrite the overall accepted status', async () => {
      existingReview('accepted')

      await updateTestReport(db, 'APP-1', testReport, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).not.toHaveProperty('technicalReview.status')
    })

    test('records a failed test-report review', async () => {
      existingReview('in_review')

      await updateTestReport(
        db,
        'APP-1',
        {
          ...testReport,
          reviewStatus: false
        },
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(
        update.$set['technicalReview.documentationChecks.testReports']
      ).toBe(false)
    })

    test('clears test-report review status with null', async () => {
      existingReview('in_review')

      await updateTestReport(
        db,
        'APP-1',
        {
          ...testReport,
          reviewStatus: null
        },
        mockLogger
      )

      const [, update] = collection.updateOne.mock.calls[0]

      expect(
        update.$set['technicalReview.documentationChecks.testReports']
      ).toBeNull()
    })

    test('uses dot notation and leaves unrelated review checks untouched', async () => {
      existingReview('in_review')

      await updateTestReport(db, 'APP-1', testReport, mockLogger)

      const [, update] = collection.updateOne.mock.calls[0]

      expect(update.$set).not.toHaveProperty('testResults')
      expect(update.$set).not.toHaveProperty('technicalReview')
      expect(update.$set).not.toHaveProperty(
        'technicalReview.documentationChecks'
      )
      expect(update.$set).not.toHaveProperty(
        'technicalReview.documentationChecks.technicalDrawings'
      )
    })

    test('returns notFound when the appliance does not exist', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await updateTestReport(
        db,
        'missing',
        testReport,
        mockLogger
      )

      expect(result).toEqual({
        success: false,
        message: 'Appliance not found',
        notFound: true
      })

      expect(collection.updateOne).not.toHaveBeenCalled()
    })

    test('returns notFound when update step cannot find appliance', async () => {
      collection.findOne.mockResolvedValueOnce({
        technicalReview: {
          status: 'in_review'
        }
      })
      collection.updateOne.mockResolvedValue({
        matchedCount: 0
      })

      const result = await updateTestReport(db, 'APP-1', testReport, mockLogger)

      expect(result).toEqual({
        success: false,
        message: 'Appliance not found',
        notFound: true
      })
    })

    test('logs and rethrows database errors', async () => {
      const error = new Error('Database error')
      collection.findOne.mockRejectedValue(error)

      await expect(
        updateTestReport(db, 'APP-1', testReport, mockLogger)
      ).rejects.toThrow('Database error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'Failed to update appliance test reports'
      )
    })

    test('throws when logger is missing', async () => {
      await expect(updateTestReport(db, 'APP-1', testReport)).rejects.toThrow(
        'logger is required'
      )
    })
  })
})
