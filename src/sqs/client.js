import {
  SQSClient,
  //GetQueueUrlCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand
  //ChangeMessageVisibilityCommand
} from '@aws-sdk/client-sqs'
import { config } from '../config.js'
// const sqsClient = new SQSClient({
//   region: config.get('aws.Region'),
//   endpoint: config.get('aws.sqsEndpoint')
// })
// const command = new GetQueueUrlCommand({ QueueName: 'aqie-dc-queue' })
// const SQS_QUEUE_URL = await sqsClient.send(command)

export const sqsClient = new SQSClient({})
const SQS_QUEUE_URL = config.get('aws.sqsEndpoint')

const receiveMessage = (queueUrl) =>
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
export const main = async (queueUrl = SQS_QUEUE_URL) => {
  try {
    const { Messages } = await receiveMessage(queueUrl)

    if (!Messages) {
      return
    }

    if (Messages.length === 1) {
      console.log(Messages[0].Body)
      // TODO: Process the message here before deleting it
      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: Messages[0].ReceiptHandle
        })
      )
    } else {
      // TODO: Process the message here before deleting it
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
      return
    }
    console.error('SQS error:', err)
  }
}
