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
  ingestSqsMessage,
  createApplicationRecordViaRoute,
  markSqsMessageProcessed
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
        await ingestSqsMessage(server, message.MessageId, message.Body)
      } catch (err) {
        logger.error(
          { messageId: message.MessageId, err },
          'ingestSqsMessage failed'
        )
        continue // Skip this one, do not break the loop
      }

      try {
        await createNewApplicationRecord(message, server)
      } catch (err) {
        logger.error(
          { messageId: message.MessageId, err },
          'createNewApplicationRecord failed'
        )
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

    logger.error({ err }, 'SQS error')
  }
}
export const createNewApplicationRecord = async (message, server) => {
  let messageBody
  try {
    // Validate JSON before processing
    messageBody = JSON.parse(message.Body)
  } catch {
    logger.error({ messageBody: message.Body }, 'Invalid JSON in SQS message')
    return // Skip this invalid message so the outer batch loop can continue with the next SQS message.
  }
  //application details extraction
  const isFuel =
    messageBody.meta.formSlug ===
    'get-a-solid-fuel-certified-for-use-in-smoke-control-areas'
  const applicationType = isFuel ? 'fuel' : 'appliance'
  const applicationCollection = isFuel ? { fuels: [] } : { appliances: [] }

  const application = {
    type: applicationType,
    referenceNumber: messageBody.meta.referenceNumber,
    submittedAt: messageBody.meta.timestamp,
    ...applicationCollection
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
  //console.log('raw payload:', message.Body, 'parsed payload:', messageBody.data)
  await createApplicationRecordViaRoute(server, applicationPayload)
  await markSqsMessageProcessed(server, message.MessageId)
  logger.info(`Creating ${application.type} Application Record`)
}
