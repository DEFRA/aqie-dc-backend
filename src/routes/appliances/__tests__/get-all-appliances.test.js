import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getAllAppliances } from '#src/routes/appliances/get-all-appliances.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as applianceController from '#src/controllers/appliances-controller.js'

vi.mock('#src/controllers/appliances-controller.js', () => ({
  default: {},
  getAllAppliances: vi.fn()
}))

const validate = (query) =>
  getAllAppliances.options.validate.query.validate(query)

describe('GET /appliances', () => {
  let mockRequest
  let h

  beforeEach(() => {
    vi.clearAllMocks()
    h = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }
    mockRequest = {
      query: {
        q: 'boiler',
        page: 1,
        limit: 10,
        fuelsAllowed: []
      },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('delegates to the controller and returns pagination', async () => {
    const pagination = { page: 1, limit: 10, total: 1, totalPages: 1 }
    applianceController.getAllAppliances.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'A1' }],
      pagination
    })

    const result = await getAllAppliances.handler(mockRequest, h)

    expect(result.statusCode).toBe(statusCodes.ok)
    expect(result.pagination).toEqual(pagination)
    expect(applianceController.getAllAppliances).toHaveBeenCalledWith(
      mockRequest.db,
      {
        query: 'boiler',
        page: 1,
        limit: 10,
        fuelsAllowed: []
      },
      mockRequest.logger
    )
  })

  test('applies defaults and normalises single filter values to arrays', () => {
    const { value, error } = validate({ certifiedIn: 'England' })

    expect(error).toBeUndefined()
    expect(value).toMatchObject({
      page: 1,
      certifiedIn: ['england'],
      fuelsAllowed: [],
      applianceType: []
    })
    expect(value.limit).toBeUndefined()
  })

  test('returns a 500 Boom error when the controller fails', async () => {
    applianceController.getAllAppliances.mockRejectedValueOnce(
      new Error('db down')
    )

    const result = await getAllAppliances.handler(mockRequest, h)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
  })

  test('is a GET on /appliances', () => {
    expect(getAllAppliances.method).toBe('GET')
    expect(getAllAppliances.path).toBe('/appliances')
  })

  test.each([
    { limit: 101 },
    { page: 0 },
    { q: 'a'.repeat(51) },
    { q: '<script>' }
  ])('rejects invalid query %j', (query) => {
    expect(validate(query).error).toBeDefined()
  })
})
