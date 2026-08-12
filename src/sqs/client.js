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
        await ingestSqsMessageViaRoute(server, message)
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
  //application details extraction
  const application = {
    type:
      messageBody.formSlug ===
      'get-a-solid-fuel-certified-for-use-in-smoke-control-areas'
        ? 'fuel'
        : 'appliance',
    referenceNumber: messageBody.referenceNumber,
    submittedDate: messageBody.timestamp,
    appliances: []
  }

  if (application.type === 'fuel') {
    const mappedPayload = mapKeys(messageBody.data.main, 'fuel')
    application.appliances = mappedPayload
    await ingestSqsMessageViaRoute(server, message, mappedPayload) //save raw payload (message.body) and mapped payload to the SQS messages collection
    //NEEDTO: for ingestSQSMessage - get the reference number out so that i can use it as an id in the sqs messages collection?
    await createFuelRecordViaRoute(server, application)
  } else {
    const mappedData = splitRepeaterJson(messageBody.data)
    mappedData.forEach(async (item) => {
      const mappedPayload = mapKeys(item, 'appliance')
      await ingestSqsMessageViaRoute(
        server,
        message.MessageId,
        message.Body.data,
        messageBody.data,
        mappedPayload
      )
      application.appliances = mappedPayload
      await createApplianceRecordViaRoute(server, application, mappedPayload)
    })
  }
}
