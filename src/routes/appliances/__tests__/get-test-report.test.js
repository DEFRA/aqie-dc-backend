import { beforeEach, describe, test, expect, vi } from 'vitest'

import { getTestReport } from '../get-test-report.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { getTestReportMock } = vi.hoisted(() => ({
  getTestReportMock: vi.fn()
}))

vi.mock('../../../controllers/appliance-review-controller.js', () => ({
  getTestReport: getTestReportMock
}))

describe('GET /appliances/{id}/test-reports', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    getTestReportMock.mockReset()

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
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  test('returns 200 with test-report data', async () => {
    getTestReportMock.mockResolvedValue({
      success: true,
      data: {
        id: 'APP-123',
        ratedOutput: 5.2,
        reviewStatus: true
      }
    })

    const result = await getTestReport.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.ok)
    expect(result.data.ratedOutput).toBe(5.2)
  })

  test('passes the database, appliance ID and logger to controller', async () => {
    getTestReportMock.mockResolvedValue({
      success: true,
      data: {}
    })

    await getTestReport.handler(mockRequest, mockToolkit)

    expect(getTestReportMock).toHaveBeenCalledWith(
      mockRequest.db,
      'APP-123',
      mockRequest.logger
    )
  })

  test('returns 404 when appliance is not found', async () => {
    getTestReportMock.mockResolvedValue({
      success: false,
      notFound: true
    })

    const result = await getTestReport.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.notFound)
  })

  test('returns 500 and logs controller errors', async () => {
    const error = new Error('Database error')
    getTestReportMock.mockRejectedValue(error)

    const result = await getTestReport.handler(mockRequest, mockToolkit)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      error,
      'Failed to get appliance test reports'
    )
  })

  test('returns previously saved failed measurement values', async () => {
    getTestReportMock.mockResolvedValue({
      success: true,
      data: {
        id: 'APP-123',
        ratedOutput: 'abc',
        testedOutput: {
          rated: '-1',
          low: 'ABC123'
        },
        smokeEmissionOutput: {
          rated: '',
          low: '1abc'
        },
        reviewStatus: false
      }
    })

    const result = await getTestReport.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.ok)

    expect(result.data).toEqual({
      id: 'APP-123',
      ratedOutput: 'abc',
      testedOutput: {
        rated: '-1',
        low: 'ABC123'
      },
      smokeEmissionOutput: {
        rated: '',
        low: '1abc'
      },
      reviewStatus: false
    })
  })

  test('route is GET', () => {
    expect(getTestReport.method).toBe('GET')
  })

  test('uses the frontend test-reports path', () => {
    expect(getTestReport.path).toBe('/appliances/{id}/test-reports')
  })
})
