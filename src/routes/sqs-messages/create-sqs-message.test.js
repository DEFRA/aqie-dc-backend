import { beforeEach, describe, test, expect, vi } from 'vitest'
import { createSqsMessage } from './create-sqs-message.js'
import * as sqsMessagesController from '#src/controllers/sqs-messages-controller.js'
import { statusCodes } from '#src/common/constants/status-codes.js'

vi.mock('#src/controllers/sqs-messages-controller.js', () => ({
  createSqsMessage: vi.fn()
}))

describe('create-sqs-message route', () => {
  let request
  let h
  let responseMock

  beforeEach(() => {
    vi.clearAllMocks()

    responseMock = {
      code: vi.fn(function (statusCode) {
        return {
          statusCode,
          payload: this.payload
        }
      })
    }

    h = {
      response: vi.fn((payload) => {
        responseMock.payload = payload
        return responseMock
      })
    }

    request = {
      db: { collection: vi.fn() },
      payload: {
        messageId: 'msg-123',
        messageBody: '{"test":true}',
        mappedPayload: {
          test: true
        }
      },
      logger: {
        error: vi.fn(),
        info: vi.fn()
      }
    }
  })

  describe('route configuration', () => {
    test('uses POST method', () => {
      expect(createSqsMessage.method).toBe('POST')
    })

    test('uses correct path', () => {
      expect(createSqsMessage.path).toBe('/sqs-messages')
    })

    test('contains api tags', () => {
      expect(createSqsMessage.options.tags).toEqual(['api', 'sqs-messages'])
    })
  })

  describe('handler', () => {
    test('calls controller with db, payload and logger', async () => {
      sqsMessagesController.createSqsMessage.mockResolvedValue({
        success: true
      })

      await createSqsMessage.handler(request, h)

      expect(sqsMessagesController.createSqsMessage).toHaveBeenCalledWith(
        request.db,
        request.payload,
        request.logger
      )
    })

    test('returns created response when controller succeeds', async () => {
      const controllerResponse = {
        success: true,
        message: 'Sqs message stored successfully',
        _id: 'mongo-id-123'
      }

      sqsMessagesController.createSqsMessage.mockResolvedValue(
        controllerResponse
      )

      const result = await createSqsMessage.handler(request, h)

      expect(h.response).toHaveBeenCalledWith(controllerResponse)
      expect(responseMock.code).toHaveBeenCalledWith(statusCodes.created)

      expect(result).toEqual({
        statusCode: statusCodes.created,
        payload: controllerResponse
      })
    })

    test('returns controller result unchanged', async () => {
      const controllerResponse = {
        success: true,
        customField: 'test-value'
      }

      sqsMessagesController.createSqsMessage.mockResolvedValue(
        controllerResponse
      )

      const result = await createSqsMessage.handler(request, h)

      expect(result.payload).toEqual(controllerResponse)
    })

    test('logs error when controller throws', async () => {
      const error = new Error('Database failure')

      sqsMessagesController.createSqsMessage.mockRejectedValue(error)

      await createSqsMessage.handler(request, h)

      expect(request.logger.error).toHaveBeenCalledWith(
        'Error creating SQS message:',
        error
      )
    })

    test('returns internal server error response when controller throws', async () => {
      const error = new Error('Database failure')

      sqsMessagesController.createSqsMessage.mockRejectedValue(error)

      const result = await createSqsMessage.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create SQS message',
        error: 'Database failure'
      })

      expect(responseMock.code).toHaveBeenCalledWith(
        statusCodes.internalServerError
      )

      expect(result).toEqual({
        statusCode: statusCodes.internalServerError,
        payload: {
          success: false,
          message: 'Failed to create SQS message',
          error: 'Database failure'
        }
      })
    })

    test('handles errors without message property', async () => {
      const error = new Error()

      sqsMessagesController.createSqsMessage.mockRejectedValue(error)

      const result = await createSqsMessage.handler(request, h)

      expect(result.statusCode).toBe(statusCodes.internalServerError)

      expect(result.payload.success).toBe(false)
      expect(result.payload.message).toBe('Failed to create SQS message')
    })
  })
})
