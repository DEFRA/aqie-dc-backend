import {
  SQSClient,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  //DeleteMessageCommand,
  DeleteMessageBatchCommand
} from '@aws-sdk/client-sqs'

import { config } from '../config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { mapKeys } from './mapper.js'
import { splitRepeaterJson } from './repeater.js'
import {
  ingestSqsMessageViaRoute,
  createApplianceRecordViaRoute,
  createFuelRecordViaRoute
} from './dispatcher.js'
import { exampleA } from './example.js'

const logger = createLogger()

// -------------------------------
// SQS CLIENT
// -------------------------------
export const sqsClient = new SQSClient({
  region: config.get('aws.region'),
  endpoint: config.get('aws.sqsEndpoint')
  // credentials automatically loaded from env / IAM if running on EC2 / Lambda
})

// -------------------------------
// GET QUEUE URL (Recommended)
// -------------------------------
const getQueueUrl = async () => {
  const { QueueUrl } = await sqsClient.send(
    new GetQueueUrlCommand({
      QueueName: 'aqie-dc-queue'
      //config.get('aws.queueName') // aqie-dc-queue
    })
  )

  return QueueUrl
}

// -------------------------------
// SQS RECEIVE
// -------------------------------
const receiveMessage = (queueUrl, abortSignal) =>
  sqsClient.send(
    new ReceiveMessageCommand({
      AttributeNames: ['SentTimestamp'],
      MessageAttributeNames: ['All'],
      MaxNumberOfMessages: 10, // supports batch
      QueueUrl: queueUrl,
      WaitTimeSeconds: 10 // long polling
    }),
    { abortSignal } // AbortSignal so polling can stop cleanly.
  )

// -------------------------------
// MAIN POLLING FUNCTION
// -------------------------------
export const main = async (server, queueUrl, abortSignal) => {
  try {
    //This is for exploring mapping - delete later
    if (process.env.ENVIRONMENT === 'local') {
      await createNewRecord(exampleA, server)
      console.log(exampleA)
    }
    //end of exploring mapping - delete later

    if (!queueUrl) {
      queueUrl = await getQueueUrl() // ★ Correct queue URL
    }

    const { Messages } = await receiveMessage(queueUrl, abortSignal)

    if (!Messages) {
      return
    }
    logger.info(`Received ${Messages.length} message(s) from SQS`)

    // -------------------------------
    // MULTIPLE MESSAGES
    // -------------------------------
    for (const message of Messages) {
      try {
        await createNewRecord(message, server)
      } catch (err) {
        logger.error('API call failed. MessageId:', message.MessageId)
        logger.error(err)
        continue // Skip this one, do not break the loop
      }
    }

    // Batch delete
    await sqsClient.send(
      new DeleteMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: Messages.map((msg) => ({
          Id: msg.MessageId,
          ReceiptHandle: msg.ReceiptHandle
        }))
      })
    )
  } catch (err) {
    if (err.name === 'AbortError') {
      // logger.info('SQS polling aborted gracefully.')
      return
    }

    logger.error('SQS error:', err)
  }
}
//will the loop that is in will it keep going if one of the messages fails? i think it will, but i need to test it. i think it will just log the error and continue to the next message. i need to make sure that the delete batch command is only called for the messages that were successfully processed. i think it will be, because the delete batch command is outside of the loop. i need to make sure that the delete batch command is only called for the messages that were successfully processed. i think it will be, because the delete batch command is outside of the loop.
const createNewRecord = async (message, server) => {
  let messageBody
  try {
    // Validate JSON before processing
    messageBody = JSON.parse(message.Body)
  } catch {
    logger.error('Invalid JSON in SQS message:', message.Body)
    logger.error(message.Body)
    return //need to continue the loop
  }
  const type =
    messageBody.formSlug ===
    'get-a-solid-fuel-certified-for-use-in-smoke-control-areas'
      ? 'fuel'
      : 'appliance'

  if (type === 'fuel') {
    const mappedPayload = mapKeys(messageBody.data.main, 'fuel')
    await ingestSqsMessageViaRoute(server, message, mappedPayload) //save raw payload (message.body) and mapped payload to the SQS messages collection
    //NEEDTO: possibly to get the reference number out so that i can use it as an id in the sqs messages collection?
    await createFuelRecordViaRoute(server, mappedPayload)
  } else {
    const mappedData = splitRepeaterJson(messageBody.data)
    mappedData.forEach(async (item) => {
      const mappedPayload = mapKeys(item, 'appliance')
      await ingestSqsMessageViaRoute(server, message, mappedPayload)
      await createApplianceRecordViaRoute(server, mappedPayload)
    })
  }
}
