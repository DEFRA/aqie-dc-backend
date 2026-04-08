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
import { callCreateAPI, callQueueAPI } from './api-caller.js'
import { exampleA } from './example.js'

const logger = createLogger()

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

    if (!Messages) return
    logger.info(`Received ${Messages.length} message(s) from SQS`)
    logger.debug('Messages:', Messages)

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
    for (const message of Messages) {
      let messageBody

      try {
        // Validate JSON before processing
        logger.info(message.Body)
        messageBody = JSON.parse(message.Body)
      } catch {
        logger.error('Invalid JSON in SQS message:', message.Body)
        logger.error(message.Body)
        continue // Skip this one, do not break the loop
      }

      //Temporary - delete later
      try {
        await callQueueAPI(server, message.Body)
      } catch {
        logger.error('Failed internal Queue API')
      }
      //

      try {
        await createNewRecord(messageBody, server)
      } catch (err) {
        logger.error('API call failed. MessageId:', message.MessageId)
        logger.error(err)
        console.log(exampleA) //temporary - delete later
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
      logger.info('SQS polling aborted gracefully.')
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
