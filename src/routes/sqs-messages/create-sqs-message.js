/**
 * @file create-sqs-message.js
 * @description Ingestion route to store both raw and pre-processed (mapped) SQS messages from the queue.
 * Used strictly for debugging and backup before main ingestion of messages.
 */
//create a POST route to store both raw and pre-processed (mapped) SQS messages from the queue, just like create-application.js, but for SQS messages.
// it will import the soon to be created function createSqsMessage from the sqs-messages-controller.js file, and call it with the payload from the request body. It will return the result of the function call as the response.
import * as sqsMessagesController from '../../controllers/sqs-messages-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const createSqsMessage = {
  method: 'POST',
  path: '/sqs-messages',
  options: {
    tags: ['api', 'sqs-messages']
  },
  handler: async (request, h) => {
    try {
      const result = await sqsMessagesController.createSqsMessage(
        request.db,
        request.payload,
        request.logger
      )

      return h.response(result).code(statusCodes.created)
    } catch (error) {
      request.logger.error('Error creating SQS message:', error)
      return h
        .response({
          success: false,
          message: 'Failed to create SQS message',
          error: error.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
