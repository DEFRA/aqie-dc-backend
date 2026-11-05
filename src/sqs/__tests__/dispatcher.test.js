import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  applicationRecordExists,
  createApplicationRecordViaRoute,
  ingestSqsMessage,
  markSqsMessageFailed,
  markSqsMessageProcessed
} from '../dispatcher.js'
import {
  createSqsMessage,
  markMessageFailed,
  markMessageProcessed
} from '#src/controllers/sqs-messages-controller.js'
import { applicationExistsByReference } from '#src/controllers/applications-controller.js'
import { statusCodes } from '#src/common/constants/status-codes.js'

vi.mock('#src/controllers/sqs-messages-controller.js', () => ({
  createSqsMessage: vi.fn(),
  markMessageProcessed: vi.fn(),
  markMessageFailed: vi.fn()
}))

vi.mock('#src/controllers/applications-controller.js', () => ({
  applicationExistsByReference: vi.fn()
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

    test('logs the payload when running in the local environment', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.stubEnv('ENVIRONMENT', 'local')
      server.inject.mockResolvedValue({
        statusCode: statusCodes.created,
        result: {}
      })

      await createApplicationRecordViaRoute(server, { type: 'fuel' })

      expect(logSpy).toHaveBeenCalledWith({ type: 'fuel' })
      vi.unstubAllEnvs()
      logSpy.mockRestore()
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

  describe('ingestSqsMessage', () => {
    test('returns the controller result on success', async () => {
      createSqsMessage.mockResolvedValue({ success: true, _id: 'msg-1' })

      const result = await ingestSqsMessage(server, 'message-id', 'raw-body')

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
        ingestSqsMessage(server, 'message-id', 'raw-body')
      ).rejects.toThrow('Failed to store SQS message: DB unavailable')
    })
  })

  describe('markSqsMessageProcessed', () => {
    test('delegates to markMessageProcessed with server db/logger', async () => {
      markMessageProcessed.mockResolvedValue({ success: true })

      const result = await markSqsMessageProcessed(server, 'message-id')

      expect(markMessageProcessed).toHaveBeenCalledWith(
        server.db,
        'message-id',
        server.logger,
        undefined
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('markSqsMessageFailed', () => {
    test('delegates to markMessageFailed with server db/logger', async () => {
      markMessageFailed.mockResolvedValue({ success: true })

      const result = await markSqsMessageFailed(
        server,
        'message-id',
        'no-appliances'
      )

      expect(markMessageFailed).toHaveBeenCalledWith(
        server.db,
        'message-id',
        'no-appliances',
        server.logger
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('applicationRecordExists', () => {
    test('delegates to applicationExistsByReference with server db', async () => {
      applicationExistsByReference.mockResolvedValue(true)

      const result = await applicationRecordExists(server, 'REF-1')

      expect(applicationExistsByReference).toHaveBeenCalledWith(
        server.db,
        'REF-1'
      )
      expect(result).toBe(true)
    })
  })
})
