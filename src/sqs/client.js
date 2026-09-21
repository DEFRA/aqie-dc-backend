import {
  SQSClient,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  //DeleteMessageCommand,
  DeleteMessageBatchCommand
} from '@aws-sdk/client-sqs'

import { config } from '../config.js'
import { createLogger } from '#src/common/helpers/logging/logger.js'
import { mapKeys } from './mapper.js'
import { splitRepeaterJson } from './repeater.js'
import {
  ingestSqsMessageViaRoute,
  createApplicationRecordViaRoute
} from './dispatcher.js'

const logger = createLogger()

// -------------------------------
// SQS CLIENT
// -------------------------------
export const sqsClient = new SQSClient({
  region: config.get('aws.region'),
  endpoint: config.get('aws.sqs.endpoint')
  // credentials automatically loaded from env / IAM if running on EC2 / Lambda
})

// -------------------------------
// GET QUEUE URL (Recommended)
// -------------------------------
const getQueueUrl = async () => {
  const { QueueUrl } = await sqsClient.send(
    new GetQueueUrlCommand({
      QueueName: config.get('aws.sqs.queueName')
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
        await createNewApplicationRecord(message, server)
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
const createNewApplicationRecord = async (message, server) => {
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
  const isFuel =
    messageBody.meta.formSlug ===
    'get-a-solid-fuel-certified-for-use-in-smoke-control-areas'
  const application = {
    type: isFuel ? 'fuel' : 'appliance',
    referenceNumber: messageBody.meta.referenceNumber,
    submittedAt: messageBody.meta.timestamp,
    ...(isFuel ? { fuels: [] } : { appliances: [] })
  }

  if (application.type === 'fuel') {
    const mappedFuelData = mapKeys(messageBody.data.main, 'fuel')
    application.fuels.push(mappedFuelData)
  } else {
    const repeaters = splitRepeaterJson(messageBody.data)
    repeaters.forEach((repeater) => {
      const mappedAppliance = mapKeys(repeater, 'appliance')
      application.appliances.push(mappedAppliance)
    })
  }
  const applicationPayload = JSON.stringify(application)
  await ingestSqsMessageViaRoute(
    server,
    message.MessageId, // reference number instead of messageId?
    message.Body, // raw payload
    messageBody.data, //parsedMessageBody
    applicationPayload
  )
  await createApplicationRecordViaRoute(server, applicationPayload)
  logger.info(`Creating ${application.type} Application Record`)
}
