import Boom from '@hapi/boom'
import { statusCodes } from '../constants/status-codes.js'

export function respondWithResult(h, result, successCode = statusCodes.ok) {
  let code
  if (result?.notFound) {
    code = statusCodes.notFound
  } else if (result?.incomplete) {
    code = statusCodes.conflict
  } else {
    code = successCode
  }
  return h.response(result).code(code)
}

/**
 * Map a controller error to a user-safe Boom response.
 * Errors with status >= 500 become 502 only when `unavailableMessage` is provided.
 */
export function handleRouteError(
  request,
  error,
  { logMessage, fallbackMessage, unavailableMessage }
) {
  request.logger.error(error, logMessage)

  if (Boom.isBoom(error)) {
    throw error
  }

  const status = error?.status
  if (
    unavailableMessage &&
    status &&
    status >= statusCodes.internalServerError
  ) {
    return Boom.badGateway(unavailableMessage)
  }

  return Boom.internal(fallbackMessage)
}

/**
 * Wrap a controller call in the standard handler flow.
 */
export function createResultHandler(fetch, options) {
  return async (request, h) => {
    try {
      const result = await fetch(request)
      return respondWithResult(h, result, options.successCode)
    } catch (error) {
      return handleRouteError(request, error, options)
    }
  }
}
