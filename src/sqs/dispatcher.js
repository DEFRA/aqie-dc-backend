// -------------------------------
// INTERNAL ROUTE / API CALLS (Hapi inject)
// -------------------------------

import { statusCodes } from '#src/common/constants/status-codes.js'
import { createSqsMessage } from '#src/controllers/sqs-messages-controller.js'

// --- Application Management Routes (appliances or fuels, based on payload.type) ---

export async function createApplicationRecordViaRoute(server, payload) {
  //This is for exploring mapping locally - delete later
  if (process.env.ENVIRONMENT === 'local') {
    console.log(payload)
  }
  //End

  const response = await server.inject({
    method: 'POST',
    url: `/applications`,
    payload
  })

  if (response.statusCode !== statusCodes.created) {
    throw new Error(
      `Internal API error: ${response.statusCode} - ${response.result?.msg}`
    )
  }

  return response.result
}

// --- SQS Message Management Routes ---
//This function is used to ingest SQS messages into the system for debugging and backup purposes
// This function calls the controller directly rather than via a route, so that it is not accessible externally.
export async function ingestSqsMessageViaRoute(
  server,
  messageId,
  messageBody,
  parsedMessageBody,
  mappedPayload
) {
  const result = await createSqsMessage(
    server.db,
    { messageId, messageBody, parsedMessageBody, mappedPayload },
    server.logger
  )

  if (!result.success) {
    throw new Error(`Failed to store SQS message: ${result.message}`)
  }

  return result
}
