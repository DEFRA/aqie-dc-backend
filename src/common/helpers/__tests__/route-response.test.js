import { describe, it, expect, vi } from 'vitest'
import Boom from '@hapi/boom'
import {
  createResultHandler,
  handleRouteError,
  respondWithResult
} from '../route-response.js'

const makeH = () => {
  const response = { code: vi.fn().mockReturnThis() }
  return { response: vi.fn(() => response), _response: response }
}
const makeRequest = () => ({ logger: { error: vi.fn() } })
const options = {
  logMessage: 'log',
  fallbackMessage: 'fallback',
  unavailableMessage: 'unavailable'
}

describe('respondWithResult', () => {
  it('returns 200 for a found result', () => {
    const h = makeH()
    respondWithResult(h, { id: 1 })
    expect(h._response.code).toHaveBeenCalledWith(200)
  })

  it('returns 404 when result.notFound is set', () => {
    const h = makeH()
    respondWithResult(h, { notFound: true })
    expect(h._response.code).toHaveBeenCalledWith(404)
  })

  it('returns 409 when result.incomplete is set', () => {
    const h = makeH()
    respondWithResult(h, { incomplete: true })
    expect(h._response.code).toHaveBeenCalledWith(409)
  })

  it('uses the provided success code', () => {
    const h = makeH()
    respondWithResult(h, { id: 1 }, 201)
    expect(h._response.code).toHaveBeenCalledWith(201)
  })
})

describe('handleRouteError', () => {
  it('rethrows Boom errors', () => {
    const err = Boom.badRequest('bad')
    expect(() => handleRouteError(makeRequest(), err, options)).toThrow(err)
  })

  it('returns 502 for upstream 5xx when unavailableMessage given', () => {
    const result = handleRouteError(
      makeRequest(),
      Object.assign(new Error('x'), { status: 503 }),
      options
    )
    expect(result.output.statusCode).toBe(502)
    expect(result.output.payload.message).toBe('unavailable')
  })

  it('returns 500 for 5xx when no unavailableMessage given', () => {
    const result = handleRouteError(
      makeRequest(),
      Object.assign(new Error('x'), { status: 503 }),
      { logMessage: 'log', fallbackMessage: 'fallback' }
    )
    expect(result.output.statusCode).toBe(500)
  })

  it('returns 500 for generic errors and logs', () => {
    const request = makeRequest()
    const err = new Error('boom')
    const result = handleRouteError(request, err, options)
    expect(result.output.statusCode).toBe(500)
    expect(request.logger.error).toHaveBeenCalledWith(err, 'log')
  })
})

describe('createResultHandler', () => {
  it('responds with fetched result', async () => {
    const h = makeH()
    const handler = createResultHandler(async () => ({ id: 1 }), options)
    await handler(makeRequest(), h)
    expect(h.response).toHaveBeenCalledWith({ id: 1 })
    expect(h._response.code).toHaveBeenCalledWith(200)
  })

  it('maps thrown errors', async () => {
    const handler = createResultHandler(async () => {
      throw new Error('fail')
    }, options)
    const result = await handler(makeRequest(), makeH())
    expect(result.output.statusCode).toBe(500)
  })
})
