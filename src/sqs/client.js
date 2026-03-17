import {
  SQSClient,
  //GetQueueUrlCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand
  //ChangeMessageVisibilityCommand
} from '@aws-sdk/client-sqs'
import { config } from '../config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
const logger = createLogger()
// const sqsClient = new SQSClient({
//   region: config.get('aws.Region'),
//   endpoint: config.get('aws.sqsEndpoint')
// })
// const command = new GetQueueUrlCommand({ QueueName: 'aqie-dc-queue' })
// const SQS_QUEUE_URL = await sqsClient.send(command)

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

export const sqsClient = new SQSClient({
  region: config.get('aws.region'), // REQUIRED
  endpoint: config.get('aws.sqsEndpoint') // Optional for Localstack or custom endpoint
  // For real AWS SQS, credentials are typically loaded from environment variables or IAM roles, so we don't hardcode them here.
  //   credentials: {
  //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  //   }
})

const SQS_QUEUE_URL = config.get('aws.sqsEndpoint')

const receiveMessage = (queueUrl, abortSignal) =>
  sqsClient.send(
    new ReceiveMessageCommand({
      AttributeNames: ['SentTimestamp'],
      MaxNumberOfMessages: 1,
      MessageAttributeNames: ['All'],
      QueueUrl: queueUrl,
      WaitTimeSeconds: 1
    }),
    { abortSignal } // AbortSignal so polling can stop cleanly.
  )
// export const main = async (queueUrl = queueURL) => {
//   const { Messages } = await receiveMessage(queueUrl)

//   const response = await sqsClient.send(
//     new ChangeMessageVisibilityCommand({
//       QueueUrl: queueUrl,
//       ReceiptHandle: Messages[0].ReceiptHandle,
//       VisibilityTimeout: 20
//     })
//   )
//   console.log(response)
//   return response
// }
export const main = async (server, queueUrl = SQS_QUEUE_URL, abortSignal) => {
  try {
    const { Messages } = await receiveMessage(queueUrl, abortSignal)

    if (!Messages) {
      return
    }

    if (Messages.length === 1) {
      console.log(Messages[0].Body)
      logger.info(Messages[0].Body)

      // Parse SQS message
      const data = JSON.parse(Messages[0].Body)

      // Call the create API
      const apiResult = await callCreateAPI(server, data.type, data.payload)
      console.log('Created item:', apiResult)
      logger.info('Created item:', apiResult)

      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: Messages[0].ReceiptHandle
        })
      )
    } else {
      // Messages is an array
      for (const message of Messages) {
        console.log('Processing multi message:', message.Body)
        logger.info('Processing multi message:', message.Body)

        // Parse SQS payload
        let data
        try {
          data = JSON.parse(message.Body)
        } catch (err) {
          console.error('Invalid JSON in SQS message:', message.Body)
          logger.error('Invalid JSON in SQS message:', message.Body)
          continue // Skip this one, do not break the loop
        }

        // Call your create API
        try {
          const apiResult = await callCreateAPI(server, data.type, data.payload)
          console.log('Created item:', apiResult)
          logger.info('Created item:', apiResult)
        } catch (apiErr) {
          console.error('API call failed for message:', message.MessageId)
          console.error(apiErr)
          logger.error('API call failed for message:', message.MessageId)
          logger.error(apiErr)
          continue // Skip deletion for this message if API failed
        }
      }

      await sqsClient.send(
        new DeleteMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: Messages.map((message) => ({
            Id: message.MessageId,
            ReceiptHandle: message.ReceiptHandle
          }))
        })
      )
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('SQS polling aborted gracefully.')
      logger.info('SQS polling aborted gracefully.')
      return
    }
    console.error('SQS error:', err)
    logger.error('SQS error:', err)
  }
}
