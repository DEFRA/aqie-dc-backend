// -------------------------------
// INTERNAL API CALL (Hapi inject)
// -------------------------------
export async function callCreateAPI(server, type, payload) {
  //This is for exploring mapping - delete later
  if (process.env.ENVIRONMENT === 'local') {
    console.log(payload)
  }
  callQueueAPI(server, payload)
  //End of exploring mapping - delete later

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
//This is for exploring mapping - delete or extract later
export async function callQueueAPI(server, payload) {
  const response = await server.inject({
    method: 'POST',
    url: `/add-new/queue`,
    payload
  })

  if (response.statusCode >= 400) {
    throw new Error(
      `Internal Queue API error: ${response.statusCode} - ${response.result?.msg}`
    )
  }

  return response.result
}
//end of exploring mapping - delete or extract later
