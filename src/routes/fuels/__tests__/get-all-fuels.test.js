import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getAllFuels } from '#src/routes/fuels/get-all-fuels.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as fuelsController from '#src/controllers/fuels-controller.js'

vi.mock('#src/controllers/fuels-controller.js', () => ({
  default: {},
  getAllFuels: vi.fn()
}))

const validate = (query) => getAllFuels.options.validate.query.validate(query)

describe('GET /fuels', () => {
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
        q: 'wood',
        page: 1,
        limit: 10
      },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('delegates to the controller and returns pagination', async () => {
    const pagination = { page: 1, limit: 10, total: 5, totalPages: 1 }
    fuelsController.getAllFuels.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'F1' }],
      pagination
    })

    const result = await getAllFuels.handler(mockRequest, h)

    expect(result.statusCode).toBe(statusCodes.ok)
    expect(result.pagination).toEqual(pagination)
    expect(fuelsController.getAllFuels).toHaveBeenCalledWith(
      mockRequest.db,
      {
        query: 'wood',
        page: 1,
        limit: 10
      },
      mockRequest.logger
    )
  })

  test('applies defaults for pagination', () => {
    const { value, error } = validate({ q: 'wood' })

    expect(error).toBeUndefined()
    expect(value).toMatchObject({ q: 'wood', page: 1 })
    expect(value.limit).toBeUndefined()
  })

  test('returns a 500 Boom error when the controller fails', async () => {
    fuelsController.getAllFuels.mockRejectedValueOnce(new Error('db down'))

    const result = await getAllFuels.handler(mockRequest, h)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
  })

  test('is a GET on /fuels', () => {
    expect(getAllFuels.method).toBe('GET')
    expect(getAllFuels.path).toBe('/fuels')
  })

  test('allows empty query', () => {
    const { value, error } = validate({ q: '' })

    expect(error).toBeUndefined()
    expect(value.q).toBe('')
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
