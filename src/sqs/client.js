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
import { callCreateAPI, callQueueAPI } from './api-caller.js'
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
      createNewRecord(exampleA, server)
      console.log(exampleA)
    }
    //end of exploring mapping - delete later

    if (!queueUrl) {
      queueUrl = await getQueueUrl() // ★ Correct queue URL
    }

    const { Messages } = await receiveMessage(queueUrl, abortSignal)

    if (!Messages) return
    logger.info(`Received ${Messages.length} message(s) from SQS`)

    // -------------------------------
    // MULTIPLE MESSAGES
    // -------------------------------
    for (const message of Messages) {
      try {
        // Validate JSON before processing
        JSON.parse(message.Body)
      } catch {
        logger.error('Invalid JSON in SQS message:', message.Body)
        logger.error(message.Body)
        continue // Skip this one, do not break the loop
      }

      //This is for exploring mapping - delete or extract later
      try {
        await callQueueAPI(server, message.Body)
      } catch {
        logger.error('Failed internal Queue API')
      }
      //end

      try {
        await createNewRecord(message.body, server)
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
const createNewRecord = async (messageBody, server) => {
  const type =
    messageBody.formSlug ===
    'get-a-solid-fuel-certified-for-use-in-smoke-control-areas'
      ? 'fuel'
      : 'appliance'

  if (type === 'fuel') {
    const payload = mapKeys(messageBody.data.main, 'fuel')
    await callCreateAPI(server, type, payload)
  } else {
    const mappedData = splitRepeaterJson(messageBody.data)
    mappedData.forEach(async (item) => {
      const payload = mapKeys(item, 'appliance')
      await callCreateAPI(server, type, payload)
    })
  }
}
