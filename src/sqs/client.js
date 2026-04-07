import {
  SQSClient,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  //DeleteMessageCommand,
  DeleteMessageBatchCommand
} from '@aws-sdk/client-sqs'

//import { config } from '../config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { mapKeys } from './mapper.js'
import { splitRepeaterJson } from './repeater.js'

const logger = createLogger()

// -------------------------------
// SANITIZE MALFORMED JSON
// -------------------------------
const sanitizeJsonString = (jsonString) => {
  try {
    // Try to parse as-is first
    return JSON.parse(jsonString)
  } catch (err) {
    logger.warn('Initial JSON parse failed, attempting to sanitize...')
    try {
      // Fix bare strings in objects by converting them to indexed keys
      let sanitized = jsonString
      let fieldCounter = 0

      // Match patterns like ,"string" where string is not a value (bare string)
      sanitized = sanitized.replace(/,("(\\.|[^"\\])*")/g, (match) => {
        // Check if this is a bare string (no key before it)
        if (!match.includes(':')) {
          return `,"field_${fieldCounter++}":${match.slice(1)}`
        }
        return match
      })

      logger.info('Sanitized JSON string')
      return JSON.parse(sanitized)
    } catch (sanitizeErr) {
      logger.error('Failed to sanitize malformed JSON:', sanitizeErr.message)
      throw sanitizeErr
    }
  }
}

// -------------------------------
// SQS CLIENT
// -------------------------------
export const sqsClient = new SQSClient({
  region: 'eu-west-2',
  //config.get('aws.region'), // eu-west-2
  endpoint: 'https://sqs.eu-west-2.amazonaws.com'
  //config.get('aws.sqsEndpoint') // https://sqs.eu-west-2.amazonaws.com
  // credentials automatically loaded from env / IAM if running on EC2 / Lambda
})

// -------------------------------
// GET QUEUE URL (Recommended)
// -------------------------------
const getQueueUrl = async () => {
  logger.info('Fetching SQS queue URL for queue: aqie-dc-queue')
  try {
    const { QueueUrl } = await sqsClient.send(
      new GetQueueUrlCommand({
        QueueName: 'aqie-dc-queue'
        //config.get('aws.queueName') // aqie-dc-queue
      })
    )
    logger.info(`Successfully retrieved queue URL`)
    return QueueUrl
  } catch (err) {
    logger.error('Failed to retrieve queue URL:', err)
    throw err
  }
}

// -------------------------------
// INTERNAL API CALL (Hapi inject)
// -------------------------------
async function callCreateAPI(server, type, payload) {
  console.log(`Payload for API call: ${JSON.stringify(payload)}`)
  console.log(`Calling internal API endpoint`)
  logger.info(`Calling internal API endpoint: POST /add-new/${type}`)
  logger.debug(`API payload: ${JSON.stringify(payload)}`)
  //print out payload and try add it to db and see what happens
  console.log(`Payload for API call: ${JSON.stringify(payload)}`)
  try {
    const response = await server.inject({
      method: 'POST',
      url: `/add-new/${type}`,
      payload
    })

    logger.info(`API responded with status code: ${response.statusCode}`)
    if (response.statusCode >= 400) {
      logger.error(
        `API error response: ${response.statusCode} - ${response.result?.msg}`
      )
      throw new Error(
        `Internal API error: ${response.statusCode} - ${response.result?.msg}`
      )
    }

    logger.info(
      `API call successful, created item with ID: ${response.result?.id || 'unknown'}`
    )
    console.log(`API result: ${JSON.stringify(response.result)}`)

    return response.result
  } catch (err) {
    //here
    console.log(`API call failed for type ${type}:`, err.message)
    throw err
  }
}

// -------------------------------
// SQS RECEIVE
// -------------------------------
const receiveMessage = async (queueUrl, abortSignal) => {
  logger.debug('Receiving messages from SQS queue with long polling...')
  try {
    const result = await sqsClient.send(
      new ReceiveMessageCommand({
        AttributeNames: ['SentTimestamp'],
        MessageAttributeNames: ['All'],
        MaxNumberOfMessages: 10, // supports batch
        QueueUrl: queueUrl,
        WaitTimeSeconds: 10 // long polling
      }),
      { abortSignal } // AbortSignal so polling can stop cleanly.
    )
    logger.debug(
      `receiveMessage() returned with ${result.Messages?.length || 0} messages`
    )
    return result
  } catch (err) {
    logger.error('Error receiving messages from SQS:', err.message)
    throw err
  }
}

// -------------------------------
// MAIN POLLING FUNCTION
// -------------------------------
export const main = async (server, queueUrl, abortSignal) => {
  logger.debug('Main SQS polling cycle starting...')

  // // DELETE THIS BLOCK WHEN DONE TESTING
  // try {
  //   const testData = sanitizeJsonString('{"meta": { "formSlug": "get-a-stove-or-other-appliance-certified-for-use-in-smoke-control-areas" }, "data": { "main": { "CTGxGs": "TestCompany", "TbMaXV": true, "mwGItn": {"uprn":"100071384716","******","************","******"}, "CfdMSm": "Te", "gTshkc": "testemail@gmail.com", "eDOPFB": null, "JIeTGU": null, "tBhcJV": "ttiel", "PebAxQ": "12/01/1998", "ZvUEHQ": null, "DiJXuZ": null, "tiRhSf": "true" }, "repeaters": { "LbZxXf": [{ "cciwNV": "Test", "oSUxHw": "Pizza oven", "mVqdEy": true, "jxCIYY": 12, "Ltjqls": ["Wood logs"] }] }, "files": {} }}')
  //   await createNewRecord({ MessageId: 'test-' + Date.now() }, server, testData)
  // } catch (testErr) {
  //   console.error('❌ TEST ERROR:', testErr.message)
  // }
  // // END DELETE THIS BLOCK

  try {
    if (!queueUrl) {
      logger.debug('Queue URL not provided, fetching from AWS...')
      queueUrl = await getQueueUrl() // ★ Correct queue URL
    } else {
      logger.debug(`Using provided queue URL: ${queueUrl}`)
    }

    const { Messages } = await receiveMessage(queueUrl, abortSignal)

    if (!Messages) {
      logger.debug('No messages received from SQS queue')
      return
    }
    logger.info(`2.Received ${Messages.length} message(s) from SQS`)
    logger.debug('Messages:', Messages) // ?

    // -------------------------------
    // SINGLE MESSAGE
    // -------------------------------
    // if (Messages.length === 1) {
    //   const message = Messages[0]
    //   logger.info(`Processing message: ${JSON.parse(message)}`)
    //   logger.info(`Processing message body: ${JSON.parse(message.Body)}`)

    //   createNewRecord(message, server)

    //   await sqsClient.send(
    //     new DeleteMessageCommand({
    //       QueueUrl: queueUrl,
    //       ReceiptHandle: message.ReceiptHandle
    //     })
    //   )

    //   return
    // }

    // -------------------------------
    // MULTIPLE MESSAGES
    // -------------------------------
    let successCount = 0
    let skipCount = 0

    for (const message of Messages) {
      logger.info(`1. Processing message: ${message.MessageId}`)
      logger.debug(`Message body: ${message.Body}`)
      logger.info(message.Body)

      let data
      try {
        data = sanitizeJsonString(message.Body)
        logger.info(
          `Successfully parsed and sanitized JSON from message: ${message.MessageId}`
        )
        logger.debug(`Parsed data: ${JSON.stringify(data)}`)
      } catch (err) {
        logger.error(
          `Invalid JSON in SQS message (${message.MessageId}):`,
          message.Body
        )
        skipCount++
        continue // Skip this one, do not break the loop
      }

      try {
        await createNewRecord(message, server, data)
        logger.info(`Successfully processed message: ${message.MessageId}`)
        successCount++
      } catch (err) {
        logger.error(
          `6.Failed to process message (${message.MessageId}):`,
          err.message
        )
        logger.error(`5. Error details:`, err)
        skipCount++
        continue // Skip this one, do not break the loop
      }
    }

    logger.info(
      `4. Message processing summary - Success: ${successCount}, Skipped: ${skipCount}, Total: ${Messages.length}`
    )

    // Batch delete
    logger.info(`3. Attempting batch delete for ${Messages.length} messages`)
    try {
      const deleteResult = await sqsClient.send(
        new DeleteMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: Messages.map((msg) => ({
            Id: msg.MessageId,
            ReceiptHandle: msg.ReceiptHandle
          }))
        })
      )
      logger.info(
        `12. Batch delete completed successfully for ${Messages.length} messages`
      )
      if (deleteResult.Failed && deleteResult.Failed.length > 0) {
        logger.warn(
          `${deleteResult.Failed.length} messages failed to delete: ${JSON.stringify(deleteResult.Failed)}`
        )
      }
    } catch (err) {
      logger.error('Batch delete operation failed:', err.message)
      throw err
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.info('SQS polling aborted gracefully.')
      return
    }

    logger.error('SQS error during main polling cycle:', err.message)
    logger.error('Full error details:', err)
  }
}

const createNewRecord = async (message, server, data) => {
  logger.info(`11. Creating new record for message: ${message.MessageId}`)
  logger.debug(`Message data: ${JSON.stringify(data)}`)

  try {
    // Determine type based on form slug
    const type =
      data.formSlug ===
      'get-a-solid-fuel-certified-for-use-in-smoke-control-areas'
        ? 'fuel'
        : 'appliance'
    logger.info(`10. Message type determined: ${type}`)

    if (type === 'fuel') {
      logger.info(data.main.CTGxGs)
      logger.info(
        `Processing fuel submission for message: ${message.MessageId}`
      )
      logger.debug(`Fuel data: ${JSON.stringify(data.data)}`)

      console.log(data.main)

      // Map the main fuel data
      const payload = mapKeys(data.data.main, 'fuel')
      logger.info(
        `Successfully mapped fuel data for message: ${message.MessageId}`
      )
      logger.debug(`Mapped fuel payload: ${JSON.stringify(payload)}`)

      // Call API to create fuel record
      const apiResult = await callCreateAPI(server, type, payload)
      logger.info(
        `Fuel record created successfully for message: ${message.MessageId}, ID: ${apiResult?.id || 'unknown'}`
      )
    } else {
      logger.info(
        `9. Processing appliance submission for message: ${message.MessageId}`
      )
      console.log(`data.data`)
      console.log(data.data)
      console.log(`Appliance data: ${JSON.stringify(data.data)}`)
      logger.debug(`Appliance data: ${JSON.stringify(data.data)}`)

      // Split repeater JSON for appliances
      const mappedData = splitRepeaterJson(data.data)
      logger.info(
        `Split appliance data into ${mappedData.length} item(s) for message: ${message.MessageId}`
      )

      // Process each repeater item
      for (let i = 0; i < mappedData.length; i++) {
        const item = mappedData[i]
        logger.info(
          `Processing appliance item ${i + 1}/${mappedData.length} for message: ${message.MessageId}`
        )
        console.log(`Item data: ${JSON.stringify(item)}`)

        // Map the appliance data
        console.log(`Mapping keys for appliance item`)
        const payload = mapKeys(item, 'appliance')
        logger.info(
          `Successfully mapped appliance item ${i + 1} for message: ${message.MessageId}`
        )
        logger.debug(`Mapped appliance payload: ${JSON.stringify(payload)}`)

        // Call API to create appliance record
        const apiResult = await callCreateAPI(server, type, payload)
        logger.info(
          `Appliance item ${i + 1} created successfully for message: ${message.MessageId}, ID: ${apiResult?.id || 'unknown'}`
        )
      }

      logger.info(
        `All appliance items processed successfully for message: ${message.MessageId}`
      )
    }
  } catch (err) {
    logger.error(
      `8. Error creating record for message ${message.MessageId}:`,
      err.message
    )
    logger.error('7. Error stack:', err.stack)
    throw err
  }
}

// const createNewRecord = async (message, server) => {

//   //parsing the message body (AGAIN - we should ideally do this just once in the main loop and pass the data here?)
//   const data = JSON.parse(message.Body)
//   const type =
//     data.formSlug ===
//     'get-a-solid-fuel-certified-for-use-in-smoke-control-areas'
//       ? 'fuel'
//       : 'appliance'
//   logger.info(
//     `Creating new record of type: ${type} for message: ${message.MessageId}`
//   )
//   if (type === 'fuel') {
//     logger.info(`Processing fuel data for message: ${message.MessageId}`)
//     logger.info(`data: ${JSON.stringify(data)}`)
//     const payload = mapKeys(data.data.main, 'fuel')
//     logger.info(`payload: ${JSON.stringify(payload)}`)
//     const apiResult = await callCreateAPI(server, type, payload)
//     logger.info('Created item:', apiResult)
//   } else {
//     logger.info(`Processing appliance data for message: ${message.MessageId}`)
//     const mappedData = splitRepeaterJson(data.data)
//     mappedData.forEach(async (item) => {
//       logger.info(`mappedData item: ${JSON.stringify(item)}`)
//       const payload = mapKeys(item, 'appliance')
//       logger.info(`payload: ${JSON.stringify(payload)}`)
//       const apiResult = await callCreateAPI(server, type, payload)
//       logger.info('Created item:', apiResult)
//     })
//   }
// }
