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
// INTERNAL API CALL (Hapi inject)
// -------------------------------
async function callCreateAPI(server, type, payload) {
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
      logger.info(`Processing multi message:`)
      logger.info(message.Body)
      logger.info(`Processing multi message: ${message.Body}`)
      

      let data
      try {
        data = JSON.parse(message.Body)
        logger.info(`Parsed JSON in SQS message:${data}`)
        logger.info(`Parsed JSON in SQS message:${JSON.stringify(data)}`)
        //Parsed JSON in SQS message:[object Object] 
      } catch {
        logger.error('Invalid JSON in SQS message:', message.Body)
        continue // Skip this one, do not break the loop
      }

      try {
        createNewRecord(message, server)
        logger.info(`Creating new record for message: ${message.MessageId}`)

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
      logger.info('SQS polling aborted gracefully.')
      return
    }

    logger.error('SQS error:', err)
  }
}
const createNewRecord = async (message, server) => {
  const data = JSON.parse(message.Body)
  const type =
    data.formSlug ===
    'get-a-solid-fuel-certified-for-use-in-smoke-control-areas'
      ? 'fuel'
      : 'appliance'
logger.info(`Creating new record of type: ${type} for message: ${message.MessageId}`)
  if (type === 'fuel') {
    logger.info(`Processing fuel data for message: ${message.MessageId}`)
    logger.info(`data: ${JSON.stringify(data)}`)
    const payload = mapKeys(data.data.main, 'fuel')
    logger.info(`payload: ${JSON.stringify(payload)}`)
    const apiResult = await callCreateAPI(server, type, payload)
    logger.info('Created item:', apiResult)
  } else {
    logger.info(`Processing appliance data for message: ${message.MessageId}`)
    const mappedData = splitRepeaterJson(data.data)
    mappedData.forEach(async (item) => {
      logger.info(`mappedData item: ${JSON.stringify(item)}`)
      const payload = mapKeys(item, 'appliance')
      logger.info(`payload: ${JSON.stringify(payload)}`)
      const apiResult = await callCreateAPI(server, type, payload)
      logger.info('Created item:', apiResult)
    })
  }
}
