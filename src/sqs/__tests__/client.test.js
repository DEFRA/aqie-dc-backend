import { describe, test, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(function () {
    return { send: sendMock }
  }),
  GetQueueUrlCommand: vi.fn(function (args) {
    return { type: 'GetQueueUrl', args }
  }),
  ReceiveMessageCommand: vi.fn(function (args) {
    return { type: 'ReceiveMessage', args }
  }),
  DeleteMessageBatchCommand: vi.fn(function (args) {
    return { type: 'DeleteMessageBatch', args }
  })
}))

vi.mock('../../config.js', () => ({
  config: {
    get: vi.fn((key) => {
      const values = {
        'aws.region': 'eu-west-2',
        'aws.sqs.endpoint': 'http://localhost:4566',
        'aws.sqs.queueName': 'aqie-dc-queue'
      }
      return values[key]
    })
  }
}))

vi.mock('#src/common/helpers/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() }))
}))

vi.mock('../mapper.js', () => ({ mapKeys: vi.fn(() => ({ mapped: true })) }))

vi.mock('../repeater.js', () => ({
  splitRepeaterJson: vi.fn(() => [{ item: 1 }])
}))

vi.mock('../dispatcher.js', () => ({
  ingestSqsMessage: vi.fn(),
  createApplicationRecordViaRoute: vi.fn(),
  markSqsMessageProcessed: vi.fn()
}))

const { main, createNewApplicationRecord } = await import('../client.js')
const { mapKeys } = await import('../mapper.js')
const { splitRepeaterJson } = await import('../repeater.js')
const { ingestSqsMessage, createApplicationRecordViaRoute, markSqsMessageProcessed } =
  await import('../dispatcher.js')

describe('sqs client', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()
    server = {}
  })

  describe('main', () => {
    test('returns early when there are no messages', async () => {
      sendMock.mockResolvedValueOnce({ Messages: undefined })

      await main(server, 'http://queue-url', undefined)

      expect(sendMock).toHaveBeenCalledTimes(1)
    })

    test('resolves the queue url when one is not supplied', async () => {
      sendMock
        .mockResolvedValueOnce({ QueueUrl: 'http://resolved-queue-url' })
        .mockResolvedValueOnce({ Messages: undefined })

      await main(server, undefined, undefined)

      expect(sendMock).toHaveBeenCalledTimes(2)
    })

    test('processes each message and deletes them in a batch', async () => {
      const body = JSON.stringify({
        meta: {
          formSlug: 'apply-for-an-appliance',
          referenceNumber: 'REF-1',
          timestamp: '2024-01-01T00:00:00.000Z'
        },
        data: { repeater: [{ field: 'value' }] }
      })
      const messages = [
        { MessageId: '1', ReceiptHandle: 'rh-1', Body: body },
        { MessageId: '2', ReceiptHandle: 'rh-2', Body: body }
      ]

      sendMock
        .mockResolvedValueOnce({ Messages: messages })
        .mockResolvedValueOnce({})

      await main(server, 'http://queue-url', undefined)

      expect(ingestSqsMessage).toHaveBeenCalledTimes(2)
      expect(createApplicationRecordViaRoute).toHaveBeenCalledTimes(2)
      expect(sendMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'DeleteMessageBatch',
          args: expect.objectContaining({
            QueueUrl: 'http://queue-url',
            Entries: [
              { Id: '1', ReceiptHandle: 'rh-1' },
              { Id: '2', ReceiptHandle: 'rh-2' }
            ]
          })
        })
      )
    })

    test('continues processing remaining messages when one fails', async () => {
      const body = JSON.stringify({
        meta: {
          formSlug: 'apply-for-an-appliance',
          referenceNumber: 'REF-1',
          timestamp: '2024-01-01T00:00:00.000Z'
        },
        data: { repeater: [{ field: 'value' }] }
      })
      const messages = [
        { MessageId: '1', ReceiptHandle: 'rh-1', Body: body },
        { MessageId: '2', ReceiptHandle: 'rh-2', Body: body }
      ]

      sendMock
        .mockResolvedValueOnce({ Messages: messages })
        .mockResolvedValueOnce({})

      createApplicationRecordViaRoute
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({})

      await main(server, 'http://queue-url', undefined)

      expect(ingestSqsMessage).toHaveBeenCalledTimes(2)
    })

    test('swallows AbortError raised while polling', async () => {
      const abortError = new Error('aborted')
      abortError.name = 'AbortError'
      sendMock.mockRejectedValueOnce(abortError)

      await expect(
        main(server, 'http://queue-url', undefined)
      ).resolves.toBeUndefined()
    })

    test('logs unexpected errors raised while polling', async () => {
      sendMock.mockRejectedValueOnce(new Error('network down'))

      await expect(
        main(server, 'http://queue-url', undefined)
      ).resolves.toBeUndefined()
    })
  })

  describe('createNewApplicationRecord', () => {
    test('builds an appliance application from repeaters and dispatches it', async () => {
      const message = {
        MessageId: 'msg-1',
        Body: JSON.stringify({
          meta: {
            formSlug: 'apply-for-an-appliance',
            referenceNumber: 'REF-1',
            timestamp: '2024-01-01T00:00:00.000Z'
          },
          data: { repeater: [{ field: 'value' }] }
        })
      }

      await createNewApplicationRecord(message, server)

      expect(splitRepeaterJson).toHaveBeenCalled()
      expect(mapKeys).toHaveBeenCalledWith({ item: 1 }, 'appliance')
      expect(createApplicationRecordViaRoute).toHaveBeenCalledWith(
        server,
        expect.any(String)
      )
      expect(markSqsMessageProcessed).toHaveBeenCalledWith(server, 'msg-1')
    })

    test('builds a fuel application when the form slug matches', async () => {
      const message = {
        MessageId: 'msg-2',
        Body: JSON.stringify({
          meta: {
            formSlug:
              'get-a-solid-fuel-certified-for-use-in-smoke-control-areas',
            referenceNumber: 'REF-2',
            timestamp: '2024-01-01T00:00:00.000Z'
          },
          data: { main: { field: 'value' } }
        })
      }

      await createNewApplicationRecord(message, server)

      expect(mapKeys).toHaveBeenCalledWith({ field: 'value' }, 'fuel')
      expect(createApplicationRecordViaRoute).toHaveBeenCalledWith(
        server,
        expect.any(String)
      )
      expect(markSqsMessageProcessed).toHaveBeenCalledWith(server, 'msg-2')
    })

    test('logs and returns early when the message body is invalid JSON', async () => {
      const message = { MessageId: 'msg-3', Body: 'not-json' }

      await createNewApplicationRecord(message, server)

      expect(createApplicationRecordViaRoute).not.toHaveBeenCalled()
      expect(markSqsMessageProcessed).not.toHaveBeenCalled()
    })
  })
})
