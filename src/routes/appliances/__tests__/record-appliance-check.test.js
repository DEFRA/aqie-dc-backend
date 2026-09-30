import Boom from '@hapi/boom'
import { beforeEach, describe, test, expect, vi } from 'vitest'

import { recordApplianceCheck } from '../record-appliance-check.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { recordApplianceCheckMock } = vi.hoisted(() => ({
  recordApplianceCheckMock: vi.fn()
}))

vi.mock('../../../controllers/appliance-review-controller.js', () => ({
  recordApplianceCheck: recordApplianceCheckMock
}))

describe('PATCH /appliances/{id}/technical-review/checks', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    recordApplianceCheckMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({
          ...data,
          statusCode: code
        }))
      }))
    }

    mockRequest = {
      params: {
        id: 'APP-123'
      },
      payload: {
        check: 'technicalDrawings',
        result: true
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('returns 200 when the result is recorded', async () => {
      const outcome = {
        success: true,
        data: {
          id: 'APP-123',
          check: 'technicalDrawings',
          result: true
        }
      }

      recordApplianceCheckMock.mockResolvedValue(outcome)

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(mockToolkit.response).toHaveBeenCalledWith(outcome)
      expect(result.statusCode).toBe(statusCodes.ok)
    })

    test('passes the check and result through to the controller', async () => {
      recordApplianceCheckMock.mockResolvedValue({
        success: true,
        data: {}
      })

      await recordApplianceCheck.handler(mockRequest, mockToolkit)

      expect(recordApplianceCheckMock).toHaveBeenCalledTimes(1)
      expect(recordApplianceCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        'technicalDrawings',
        true,
        mockRequest.logger,
        undefined
      )
    })

    test('passes additional conditions data through to the controller', async () => {
      recordApplianceCheckMock.mockResolvedValue({
        success: true,
        data: {}
      })

      mockRequest.payload = {
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Standard additional condition text'
        }
      }

      await recordApplianceCheck.handler(mockRequest, mockToolkit)

      expect(recordApplianceCheckMock).toHaveBeenCalledTimes(1)
      expect(recordApplianceCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        'additionalConditions',
        true,
        mockRequest.logger,
        {
          additionalConditions: 'Standard additional condition text'
        }
      )
    })

    test('passes edited additional conditions text through to the controller', async () => {
      recordApplianceCheckMock.mockResolvedValue({
        success: true,
        data: {
          id: 'APP-123',
          check: 'additionalConditions',
          result: true
        }
      })

      mockRequest.payload = {
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Edited additional condition text'
        }
      }

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(recordApplianceCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        'additionalConditions',
        true,
        mockRequest.logger,
        {
          additionalConditions: 'Edited additional condition text'
        }
      )

      expect(result.statusCode).toBe(statusCodes.ok)
    })

    test('returns 404 when the appliance is not found', async () => {
      const outcome = {
        success: false,
        notFound: true,
        message: 'Appliance not found'
      }

      recordApplianceCheckMock.mockResolvedValue(outcome)

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(mockToolkit.response).toHaveBeenCalledWith(outcome)
      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 and logs when the controller throws a non-Boom error', async () => {
      const error = new Error('Database error')

      recordApplianceCheckMock.mockRejectedValue(error)

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(result.message).toBe('Failed to record appliance check')

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to record appliance check'
      )
    })

    test('logs and rethrows a Boom error from the controller', async () => {
      const error = Boom.badRequest(
        'Additional conditions must be marked complete and include text'
      )

      recordApplianceCheckMock.mockRejectedValue(error)

      await expect(
        recordApplianceCheck.handler(mockRequest, mockToolkit)
      ).rejects.toBe(error)

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to record appliance check'
      )

      expect(mockToolkit.response).not.toHaveBeenCalled()
    })
  })

  describe('payload validation', () => {
    const validate = (payload) =>
      recordApplianceCheck.options.validate.payload.validate(payload)

    test('accepts a passed documentation check', () => {
      const { error } = validate({
        check: 'technicalDrawings',
        result: true
      })

      expect(error).toBeUndefined()
    })

    test('accepts false for a testReports check', () => {
      const { error } = validate({
        check: 'testReports',
        result: false
      })

      expect(error).toBeUndefined()
    })

    test('accepts true for a testReports check', () => {
      const { error, value } = validate({
        check: 'testReports',
        result: true,
        data: {
          testResults: {
            ratedOutput: 10.5,
            testedOutput: {
              rated: 9.75,
              low: 4.0
            },
            smokeEmissionOutput: {
              rated: 2.25,
              low: 1.1
            }
          }
        }
      })

      expect(error).toBeUndefined()
      expect(value.result).toBe(true)
    })

    test('accepts null for a normal documentation check', () => {
      const { error } = validate({
        check: 'conformityMark',
        result: null
      })

      expect(error).toBeUndefined()
    })

    test('accepts null for technicalDrawings check', () => {
      const { error } = validate({
        check: 'technicalDrawings',
        result: null
      })

      expect(error).toBeUndefined()
    })

    test('accepts null for instructionManual check', () => {
      const { error } = validate({
        check: 'instructionManual',
        result: null
      })

      expect(error).toBeUndefined()
    })

    test('requires data for permittedFuels listing check', () => {
      const { error } = validate({
        check: 'permittedFuels',
        result: true
      })

      expect(error).toBeDefined()
    })

    test('requires data for additionalConditions check', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true
      })

      expect(error).toBeDefined()
    })

    test('accepts permittedFuels with valid check-specific data', () => {
      const { error, value } = validate({
        check: 'permittedFuels',
        result: true,
        data: {
          permittedFuels: 'Wood logs',
          isPermittedToBurnWood: true
        }
      })

      expect(error).toBeUndefined()
      expect(value.data).toEqual({
        permittedFuels: 'Wood logs',
        isPermittedToBurnWood: true
      })
    })

    test('accepts permittedFuels with null isPermittedToBurnWood', () => {
      const { error } = validate({
        check: 'permittedFuels',
        result: true,
        data: {
          permittedFuels: 'Wood logs',
          isPermittedToBurnWood: null
        }
      })

      expect(error).toBeUndefined()
    })

    test('accepts result true with valid additional conditions text', () => {
      const { error, value } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Standard additional condition text'
        }
      })

      expect(error).toBeUndefined()
      expect(value).toEqual({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Standard additional condition text'
        }
      })
    })

    test('accepts edited additional conditions text', () => {
      const { error, value } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Edited additional condition text'
        }
      })

      expect(error).toBeUndefined()
      expect(value.data.additionalConditions).toBe(
        'Edited additional condition text'
      )
    })

    test('trims valid additional conditions text', () => {
      const { error, value } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: '  Valid additional condition text  '
        }
      })

      expect(error).toBeUndefined()
      expect(value.data.additionalConditions).toBe(
        'Valid additional condition text'
      )
    })

    test.each([
      ['an empty string', ''],
      ['whitespace-only text', '   ']
    ])('rejects additional conditions containing %s', (_, value) => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: value
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects missing additionalConditions property', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {}
      })

      expect(error).toBeDefined()
    })

    test('rejects result false for additional conditions', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: false,
        data: {
          additionalConditions: 'Valid additional condition text'
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects result null for additional conditions', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: null,
        data: {
          additionalConditions: 'Valid additional condition text'
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects additional conditions exceeding the maximum length', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'a'.repeat(1001)
        }
      })

      expect(error).toBeDefined()
    })

    test('accepts additional conditions at the maximum length', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'a'.repeat(1000)
        }
      })

      expect(error).toBeUndefined()
    })

    test('rejects unknown properties inside additional conditions data', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Valid additional condition text',
          unexpectedProperty: 'not allowed'
        }
      })

      expect(error).toBeDefined()
    })

    test('forbids data for checks other than testReports, permittedFuels, and additionalConditions', () => {
      const { error } = validate({
        check: 'conformityMark',
        result: true,
        data: {
          someField: 'value'
        }
      })

      expect(error).toBeDefined()
    })

    test('accepts technicalDrawings with result true and no data', () => {
      const { error } = validate({
        check: 'technicalDrawings',
        result: true
      })

      expect(error).toBeUndefined()
    })

    test('accepts technicalDrawings with result false and no data', () => {
      const { error } = validate({
        check: 'technicalDrawings',
        result: false
      })

      expect(error).toBeUndefined()
    })

    test('accepts instructionManual with result true and no data', () => {
      const { error } = validate({
        check: 'instructionManual',
        result: true
      })

      expect(error).toBeUndefined()
    })

    test('accepts instructionManual with result false and no data', () => {
      const { error } = validate({
        check: 'instructionManual',
        result: false
      })

      expect(error).toBeUndefined()
    })

    test('accepts testReports with result false and no testResults data', () => {
      const { error } = validate({
        check: 'testReports',
        result: false
      })

      expect(error).toBeUndefined()
    })

    test('accepts testReports with result false and empty testResults object', () => {
      const { error } = validate({
        check: 'testReports',
        result: false,
        data: {
          testResults: {}
        }
      })

      expect(error).toBeUndefined()
    })

    test('accepts testReports with result false and partial testResults data', () => {
      const { error } = validate({
        check: 'testReports',
        result: false,
        data: {
          testResults: {
            ratedOutput: 'unavailable'
          }
        }
      })

      expect(error).toBeUndefined()
    })

    test('rejects an unknown check name', () => {
      const { error } = validate({
        check: 'somethingElse',
        result: true
      })

      expect(error).toBeDefined()
    })

    test('requires the check property', () => {
      const { error } = validate({
        result: true
      })

      expect(error).toBeDefined()
    })

    test('requires the result property', () => {
      const { error } = validate({
        check: 'testReports'
      })

      expect(error).toBeDefined()
    })

    test('rejects unknown payload properties', () => {
      const { error } = validate({
        check: 'testReports',
        result: true,
        'technicalReview.status': 'accepted'
      })

      expect(error).toBeDefined()
    })
  })

  describe('params validation', () => {
    const validate = (params) =>
      recordApplianceCheck.options.validate.params.validate(params)

    test('accepts a valid appliance id', () => {
      const { error } = validate({
        id: 'APP-123'
      })

      expect(error).toBeUndefined()
    })

    test('requires an appliance id', () => {
      const { error } = validate({})

      expect(error).toBeDefined()
    })

    test('rejects an appliance id longer than 64 characters', () => {
      const { error } = validate({
        id: 'A'.repeat(65)
      })

      expect(error).toBeDefined()
    })

    test('accepts an appliance id containing 64 characters', () => {
      const { error } = validate({
        id: 'A'.repeat(64)
      })

      expect(error).toBeUndefined()
    })
  })

  describe('route configuration', () => {
    test('route uses PATCH', () => {
      expect(recordApplianceCheck.method).toBe('PATCH')
    })

    test('route uses the technical-review checks path', () => {
      expect(recordApplianceCheck.path).toBe(
        '/appliances/{id}/technical-review/checks'
      )
    })

    test('route contains the expected API tags', () => {
      expect(recordApplianceCheck.options.tags).toEqual(['api', 'appliances'])
    })
  })

  describe('testReports payload validation', () => {
    const validate = (payload) =>
      recordApplianceCheck.options.validate.payload.validate(payload)

    describe('testReports marked as passed', () => {
      test('requires data when result is true', () => {
        const { error } = validate({
          check: 'testReports',
          result: true
        })

        expect(error).toBeDefined()
      })

      test('requires testResults property when result is true', () => {
        const { error } = validate({
          check: 'testReports',
          result: true,
          data: {}
        })

        expect(error).toBeDefined()
      })

      test('accepts valid passed measurements with all fields', () => {
        const { error, value } = validate({
          check: 'testReports',
          result: true,
          data: {
            testResults: {
              ratedOutput: 10.5,
              testedOutput: {
                rated: 9.75,
                low: 4.0
              },
              smokeEmissionOutput: {
                rated: 2.25,
                low: 1.1
              }
            }
          }
        })

        expect(error).toBeUndefined()
        expect(value.data.testResults.ratedOutput).toBe(10.5)
      })

      test('rounds passed measurements to two decimal places', () => {
        const { error, value } = validate({
          check: 'testReports',
          result: true,
          data: {
            testResults: {
              ratedOutput: 10.555,
              testedOutput: {
                rated: 9.765,
                low: 4.005
              },
              smokeEmissionOutput: {
                rated: 2.255,
                low: 1.105
              }
            }
          }
        })

        expect(error).toBeUndefined()
        expect(value.data.testResults.ratedOutput).toBe(10.56)
        expect(value.data.testResults.testedOutput.rated).toBe(9.77)
      })

      test('accepts zero values for measurements', () => {
        const { error } = validate({
          check: 'testReports',
          result: true,
          data: {
            testResults: {
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
          }
        })

        expect(error).toBeUndefined()
      })

      test('rejects negative values for passed measurements', () => {
        const { error } = validate({
          check: 'testReports',
          result: true,
          data: {
            testResults: {
              ratedOutput: -1,
              testedOutput: {
                rated: 9.75,
                low: 4.0
              },
              smokeEmissionOutput: {
                rated: 2.25,
                low: 1.1
              }
            }
          }
        })

        expect(error).toBeDefined()
      })

      test('rejects string values for passed measurements', () => {
        const { error } = validate({
          check: 'testReports',
          result: true,
          data: {
            testResults: {
              ratedOutput: '10.5',
              testedOutput: {
                rated: 9.75,
                low: 4.0
              },
              smokeEmissionOutput: {
                rated: 2.25,
                low: 1.1
              }
            }
          }
        })

        expect(error).toBeDefined()
      })

      test('requires all measurement fields when result is true', () => {
        const { error } = validate({
          check: 'testReports',
          result: true,
          data: {
            testResults: {
              ratedOutput: 10.5,
              testedOutput: {
                rated: 9.75
                // missing 'low'
              },
              smokeEmissionOutput: {
                rated: 2.25,
                low: 1.1
              }
            }
          }
        })

        expect(error).toBeDefined()
      })

      test('rejects unknown properties inside testResults', () => {
        const { error } = validate({
          check: 'testReports',
          result: true,
          data: {
            testResults: {
              ratedOutput: 10.5,
              testedOutput: {
                rated: 9.75,
                low: 4.0
              },
              smokeEmissionOutput: {
                rated: 2.25,
                low: 1.1
              },
              unexpectedProperty: 'not allowed'
            }
          }
        })

        expect(error).toBeDefined()
      })
    })

    describe('testReports marked as failed', () => {
      test('allows data to be optional when result is false', () => {
        const { error } = validate({
          check: 'testReports',
          result: false
        })

        expect(error).toBeUndefined()
      })

      test('accepts empty data object when result is false', () => {
        const { error } = validate({
          check: 'testReports',
          result: false,
          data: {}
        })

        expect(error).toBeUndefined()
      })

      test('accepts string measurements when result is false', () => {
        const { error, value } = validate({
          check: 'testReports',
          result: false,
          data: {
            testResults: {
              ratedOutput: '10.5',
              testedOutput: {
                rated: 'invalid',
                low: '4.0'
              },
              smokeEmissionOutput: {
                rated: 'abc',
                low: '1.1'
              }
            }
          }
        })

        expect(error).toBeUndefined()
        expect(value.data.testResults.ratedOutput).toBe('10.5')
        expect(value.data.testResults.testedOutput.rated).toBe('invalid')
      })

      test('accepts numeric measurements when result is false', () => {
        const { error, value } = validate({
          check: 'testReports',
          result: false,
          data: {
            testResults: {
              ratedOutput: 10.5,
              testedOutput: {
                rated: 9.75,
                low: 4.0
              },
              smokeEmissionOutput: {
                rated: 2.25,
                low: 1.1
              }
            }
          }
        })

        expect(error).toBeUndefined()
        expect(value.data.testResults.ratedOutput).toBe(10.5)
      })

      test('accepts negative values when result is false', () => {
        const { error } = validate({
          check: 'testReports',
          result: false,
          data: {
            testResults: {
              ratedOutput: -10.5,
              testedOutput: {
                rated: -9.75,
                low: -4.0
              },
              smokeEmissionOutput: {
                rated: -2.25,
                low: -1.1
              }
            }
          }
        })

        expect(error).toBeUndefined()
      })

      test('accepts empty strings for failed measurements', () => {
        const { error, value } = validate({
          check: 'testReports',
          result: false,
          data: {
            testResults: {
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
          }
        })

        expect(error).toBeUndefined()
        expect(value.data.testResults.ratedOutput).toBe('')
      })

      test('accepts null values for failed measurements', () => {
        const { error } = validate({
          check: 'testReports',
          result: false,
          data: {
            testResults: {
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
          }
        })

        expect(error).toBeUndefined()
      })

      test('allows partial measurements when result is false', () => {
        const { error } = validate({
          check: 'testReports',
          result: false,
          data: {
            testResults: {
              ratedOutput: '10.5'
              // other fields omitted
            }
          }
        })

        expect(error).toBeUndefined()
      })

      test('allows omitted testedOutput when result is false', () => {
        const { error } = validate({
          check: 'testReports',
          result: false,
          data: {
            testResults: {
              ratedOutput: '10.5',
              smokeEmissionOutput: {
                rated: '2.25',
                low: '1.1'
              }
            }
          }
        })

        expect(error).toBeUndefined()
      })

      test('rejects unknown properties inside testResults when result is false', () => {
        const { error } = validate({
          check: 'testReports',
          result: false,
          data: {
            testResults: {
              ratedOutput: '10.5',
              unexpectedProperty: 'not allowed'
            }
          }
        })

        expect(error).toBeDefined()
      })
    })

  describe('result and data mismatch scenarios', () => {
    const validate = (payload) =>
      recordApplianceCheck.options.validate.payload.validate(payload)

    test('rejects result=true without any testResults data (mismatch)', () => {
      const { error } = validate({
        check: 'testReports',
        result: true
      })

      expect(error).toBeDefined()
    })

    test('rejects result=true with empty testResults object (mismatch)', () => {
      const { error } = validate({
        check: 'testReports',
        result: true,
        data: {
          testResults: {}
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects result=true with string measurements (strict validation mismatch)', () => {
      const { error } = validate({
        check: 'testReports',
        result: true,
        data: {
          testResults: {
            ratedOutput: '10.5',
            testedOutput: {
              rated: '9.75',
              low: '4.0'
            },
            smokeEmissionOutput: {
              rated: '2.25',
              low: '1.1'
            }
          }
        }
      })

      expect(error).toBeDefined()
      expect(error.message).toMatch(/ratedOutput/)
    })

    test('accepts result=true with all required numeric measurements (valid contract)', () => {
      const { error, value } = validate({
        check: 'testReports',
        result: true,
        data: {
          testResults: {
            ratedOutput: 10.5,
            testedOutput: {
              rated: 9.75,
              low: 4.0
            },
            smokeEmissionOutput: {
              rated: 2.25,
              low: 1.1
            }
          }
        }
      })

      expect(error).toBeUndefined()
      expect(value.result).toBe(true)
      expect(value.data.testResults.ratedOutput).toBe(10.5)
    })

    test('accepts result=false without testResults data (flexible contract)', () => {
      const { error } = validate({
        check: 'testReports',
        result: false
      })

      expect(error).toBeUndefined()
    })

    test('accepts result=false with string measurements (flexible validation)', () => {
      const { error, value } = validate({
        check: 'testReports',
        result: false,
        data: {
          testResults: {
            ratedOutput: '10.5',
            testedOutput: {
              rated: 'unavailable',
              low: '4.0'
            },
            smokeEmissionOutput: {
              rated: 'N/A',
              low: '1.1'
            }
          }
        }
      })

      expect(error).toBeUndefined()
      expect(value.result).toBe(false)
      expect(value.data.testResults.ratedOutput).toBe('10.5')
    })

    test('accepts result=false with numeric and partial measurements (flexible contract)', () => {
      const { error, value } = validate({
        check: 'testReports',
        result: false,
        data: {
          testResults: {
            ratedOutput: 10.5,
            testedOutput: {
              rated: 9.75
            }
          }
        }
      })

      expect(error).toBeUndefined()
      expect(value.result).toBe(false)
    })

    test('accepts result=false with null values (flexible contract)', () => {
      const { error, value } = validate({
        check: 'testReports',
        result: false,
        data: {
          testResults: {
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
        }
      })

      expect(error).toBeUndefined()
      expect(value.result).toBe(false)
    })

    test('demonstrates API contract: passed (strict, all required) vs failed (flexible, optional)', () => {
      // Passed scenario - strict validation enforced
      const passedPayload = {
        check: 'testReports',
        result: true,
        data: {
          testResults: {
            ratedOutput: 10.5,
            testedOutput: {
              rated: 9.75,
              low: 4.0
            },
            smokeEmissionOutput: {
              rated: 2.25,
              low: 1.1
            }
          }
        }
      }
      const passedResult = validate(passedPayload)
      expect(passedResult.error).toBeUndefined()

      // Failed scenario - flexible validation allows partial/string data
      const failedPayload = {
        check: 'testReports',
        result: false,
        data: {
          testResults: {
            ratedOutput: 'unable to measure'
          }
        }
      }
      const failedResult = validate(failedPayload)
      expect(failedResult.error).toBeUndefined()

      // Both can be saved to database without conflict
      expect(passedResult.value.result).toBe(true)
      expect(failedResult.value.result).toBe(false)
    })
  })

    test('forbids data for checks other than testReports, permittedFuels, and additionalConditions', () => {
      const { error } = validate({
        check: 'conformityMark',
        result: true,
        data: {
          someField: 'value'
        }
      })

      expect(error).toBeDefined()
    })
  })
})
