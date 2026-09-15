// -------------------------------
// INTERNAL ROUTE / API CALLS (Hapi inject)
// -------------------------------

import { statusCodes } from '#src/common/constants/status-codes.js'

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

//This function is used to ingest SQS messages via an internal route in the server. It sends a POST request to the /sqs-messages endpoint with the provided payload.
export async function ingestSqsMessageViaRoute(
  server,
  messageId,
  messageBody,
  parsedMessageBody,
  mappedPayload
) {
  const response = await server.inject({
    method: 'POST',
    url: `/sqs-messages`,
    payload: {
      messageId,
      messageBody,
      parsedMessageBody,
      mappedPayload
    }
  })

  if (response.statusCode !== statusCodes.created) {
    throw new Error(
      `Internal Queue API error: ${response.statusCode} - ${response.result?.msg}`
    )
  }

  return response.result
}
