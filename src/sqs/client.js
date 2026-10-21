import {
  SQSClient,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand
} from '@aws-sdk/client-sqs'

import { config } from '../config.js'
import { createLogger } from '#src/common/helpers/logging/logger.js'
import { mapKeys } from './mapper.js'
import { splitRepeaterJson } from './repeater.js'
import {
  ingestSqsMessage,
  createApplicationRecordViaRoute,
  applicationRecordExists,
  markSqsMessageProcessed,
  markSqsMessageFailed
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

// Returns true when the message should be deleted from the queue
const processMessage = async (message, server) => {
  let stored
  try {
    stored = await ingestSqsMessage(
      server,
      message.MessageId,
      message.Body,
      message.Attributes?.SentTimestamp
    )
  } catch (err) {
    logger.error(
      { messageId: message.MessageId, err },
      'ingestSqsMessage failed'
    )
    return false
  }

  // Already fully handled on a previous delivery: just delete it from the queue
  if (stored.duplicate && stored.processed) {
    return true
  }

  try {
    await createNewApplicationRecord(message, server)
    return true
  } catch (err) {
    logger.error(
      { messageId: message.MessageId, err },
      'createNewApplicationRecord failed'
    )
    await recordFailure(
      server,
      message.MessageId,
      err.failureReason ?? 'create-failed'
    )
    return false
  }
}

// -------------------------------
// MAIN POLLING FUNCTION
// -------------------------------
export const main = async (server, queueUrl, abortSignal) => {
  try {
    if (!queueUrl) {
      queueUrl = await getQueueUrl()
    }

    const { Messages } = await receiveMessage(queueUrl, abortSignal)

    if (!Messages?.length) {
      return
    }

    logger.info(`Received ${Messages.length} message(s) from SQS`)

    const processedMessages = []

    for (const message of Messages) {
      // Sequential on purpose: concurrent messages could race on the same referenceNumber
      if (await processMessage(message, server)) {
        processedMessages.push({
          Id: message.MessageId,
          ReceiptHandle: message.ReceiptHandle
        })
      }
    }

    if (processedMessages.length > 0) {
      await sqsClient.send(
        new DeleteMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: processedMessages
        })
      )
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return
    }

    logger.error({ err }, 'SQS error')
  }
}
// Best-effort: a failure to record must not abort the rest of the batch
const recordFailure = async (server, messageId, failureReason) => {
  try {
    await markSqsMessageFailed(server, messageId, failureReason)
  } catch (err) {
    logger.error({ messageId, err }, 'markSqsMessageFailed failed')
  }
}

export const createNewApplicationRecord = async (message, server) => {
  let messageBody
  try {
    // Validate JSON before processing
    messageBody = JSON.parse(message.Body)
  } catch {
    logger.error(
      { messageId: message.MessageId },
      'Invalid JSON in SQS message'
    )
    await recordFailure(server, message.MessageId, 'invalid-json')
    return // Malformed JSON never succeeds on retry, so it is deleted from the queue; payload stays in SqsMessages.
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
    if (repeaters.length === 0) {
      // Likely a changed repeater key: keep the message on the queue for retry after a code fix
      throw Object.assign(
        new Error(`No appliances mapped for message ${message.MessageId}`),
        { failureReason: 'no-appliances' }
      )
    }
    repeaters.forEach((repeater) => {
      const mappedAppliance = mapKeys(repeater, 'appliance')
      application.appliances.push(mappedAppliance)
    })
  }
  const applicationPayload = JSON.stringify(application)
  if (await applicationRecordExists(server, application.referenceNumber)) {
    logger.warn(
      `Application for ${application.referenceNumber} already exists, skipping create`
    )
  } else {
    await createApplicationRecordViaRoute(server, applicationPayload)
    logger.info(`Creating ${application.type} Application Record`)
  }
  await markSqsMessageProcessed(server, message.MessageId)
}
