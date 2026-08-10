// -------------------------------
// INTERNAL ROUTE / API CALLS (Hapi inject)
// -------------------------------

import { statusCodes } from '../common/constants/status-codes.js'

// --- Fuel Management Routes ---

export async function createFuelRecordViaRoute(server, payload) {
  //This is for exploring mapping locally - delete later
  if (process.env.ENVIRONMENT === 'local') {
    console.log(payload)
  }
  //End

  const response = await server.inject({
    method: 'POST',
    url: `/fuels`,
    payload
  })

  if (response.statusCode !== statusCodes.created) {
    throw new Error(
      `Internal API error: ${response.statusCode} - ${response.result?.msg}`
    )
  }

  return response.result
}

// --- Appliance Management Routes ---

export async function createApplianceRecordViaRoute(server, payload) {
  //This is for exploring mapping locally - delete later
  if (process.env.ENVIRONMENT === 'local') {
    console.log(payload)
  }
  //End

  const response = await server.inject({
    method: 'POST',
    url: `/appliances`,
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
export async function ingestSqsMessageViaRoute(server, message, mappedPayload) {
  const { messageId, messageBody } = message

  const response = await server.inject({
    method: 'POST',
    url: `/sqs-messages`,
    payload: {
      messageId,
      messageBody,
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
