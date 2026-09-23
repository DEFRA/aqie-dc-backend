import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  createApplicationRecordViaRoute,
  ingestSqsMessageViaRoute
} from '../dispatcher.js'
import { createSqsMessage } from '#src/controllers/sqs-messages-controller.js'
import { statusCodes } from '#src/common/constants/status-codes.js'

vi.mock('#src/controllers/sqs-messages-controller.js', () => ({
  createSqsMessage: vi.fn()
}))

describe('dispatcher', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()
    server = {
      inject: vi.fn(),
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  describe('createApplicationRecordViaRoute', () => {
    test('returns the response result when the request succeeds', async () => {
      server.inject.mockResolvedValue({
        statusCode: statusCodes.created,
        result: { _id: 'app-1' }
      })

      const result = await createApplicationRecordViaRoute(server, {
        type: 'appliance'
      })

      expect(server.inject).toHaveBeenCalledWith({
        method: 'POST',
        url: '/applications',
        payload: { type: 'appliance' }
      })
      expect(result).toEqual({ _id: 'app-1' })
    })

    test('throws when the response status code is not created', async () => {
      server.inject.mockResolvedValue({
        statusCode: statusCodes.badRequest,
        result: { msg: 'Invalid payload' }
      })

      await expect(
        createApplicationRecordViaRoute(server, { type: 'appliance' })
      ).rejects.toThrow(
        `Internal API error: ${statusCodes.badRequest} - Invalid payload`
      )
    })
  })

  describe('ingestSqsMessageViaRoute', () => {
    test('returns the controller result on success', async () => {
      createSqsMessage.mockResolvedValue({ success: true, _id: 'msg-1' })

      const result = await ingestSqsMessageViaRoute(
        server,
        'message-id',
        'raw-body'
      )

      expect(createSqsMessage).toHaveBeenCalledWith(
        server.db,
        {
          messageId: 'message-id',
          messageBody: 'raw-body'
        },
        server.logger
      )
      expect(result).toEqual({ success: true, _id: 'msg-1' })
    })

    test('throws when the controller reports failure', async () => {
      createSqsMessage.mockResolvedValue({
        success: false,
        message: 'DB unavailable'
      })

      await expect(
        ingestSqsMessageViaRoute(server, 'message-id', 'raw-body')
      ).rejects.toThrow('Failed to store SQS message: DB unavailable')
    })
  })
})
