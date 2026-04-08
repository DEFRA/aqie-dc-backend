import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

// -------------------------------
// INTERNAL API CALL (Hapi inject)
// -------------------------------
export async function callCreateAPI(server, type, payload) {
  logger.info(
    `Calling internal API for type: ${type} with payload: ${JSON.stringify(payload)}`
  )
  logger.info(`${JSON.stringify(payload)}`)
  const response = await server.inject({
    method: 'POST',
    url: `/add-new/${type}`,
    payload
  })

  if (response.statusCode >= 400) {
    throw new Error(
      `Internal API error: ${response.statusCode} - ${response.result?.msg}`
    )
  }

  return response.result
}

export async function callQueueAPI(server, payload) {
  const response = await server.inject({
    method: 'POST',
    url: `/add-new/queue`,
    payload
  })

  if (response.statusCode >= 400) {
    throw new Error(
      `Internal API error: ${response.statusCode} - ${response.result?.msg}`
    )
  }

  return response.result
}
