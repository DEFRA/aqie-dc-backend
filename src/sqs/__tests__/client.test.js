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
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}))

vi.mock('../mapper.js', () => ({ mapKeys: vi.fn(() => ({ mapped: true })) }))

vi.mock('../repeater.js', () => ({
  splitRepeaterJson: vi.fn(() => [{ item: 1 }])
}))

vi.mock('../dispatcher.js', () => ({
  ingestSqsMessage: vi.fn(),
  createApplicationRecordViaRoute: vi.fn(),
  applicationRecordExists: vi.fn(),
  markSqsMessageProcessed: vi.fn(),
  markSqsMessageFailed: vi.fn()
}))

const { main, createNewApplicationRecord } = await import('../client.js')
const { mapKeys } = await import('../mapper.js')
const { splitRepeaterJson } = await import('../repeater.js')
const {
  ingestSqsMessage,
  createApplicationRecordViaRoute,
  applicationRecordExists,
  markSqsMessageProcessed,
  markSqsMessageFailed
} = await import('../dispatcher.js')

describe('sqs client', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()
    sendMock.mockReset()
    ingestSqsMessage.mockReset()
    createApplicationRecordViaRoute.mockReset()
    applicationRecordExists.mockReset()
    markSqsMessageProcessed.mockReset()
    markSqsMessageFailed.mockReset()
    mapKeys.mockReset()
    splitRepeaterJson.mockReset()

    ingestSqsMessage.mockResolvedValue({ duplicate: false, processed: false })
    createApplicationRecordViaRoute.mockResolvedValue({})
    applicationRecordExists.mockResolvedValue(false)
    markSqsMessageProcessed.mockResolvedValue(undefined)
    markSqsMessageFailed.mockResolvedValue(undefined)
    splitRepeaterJson.mockReturnValue([{ item: 1 }])
    mapKeys.mockImplementation(() => ({ mapped: true }))

    server = {}
  })

  describe('createNewApplicationRecord duplicate guard', () => {
    const message = {
      MessageId: 'm1',
      Body: JSON.stringify({
        meta: { formSlug: 'other', referenceNumber: 'REF-1', timestamp: 't' },
        data: {}
      })
    }

    test('skips create but marks processed when application already exists', async () => {
      applicationRecordExists.mockResolvedValueOnce(true)

      await createNewApplicationRecord(message, server)

      expect(createApplicationRecordViaRoute).not.toHaveBeenCalled()
      expect(markSqsMessageProcessed).toHaveBeenCalledWith(server, 'm1', undefined)
    })

    test('creates application when none exists', async () => {
      applicationRecordExists.mockResolvedValueOnce(false)

      await createNewApplicationRecord(message, server)

      expect(createApplicationRecordViaRoute).toHaveBeenCalled()
      expect(markSqsMessageProcessed).toHaveBeenCalledWith(server, 'm1', undefined)
    })
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

    test('continues processing remaining messages when one fails and only deletes successful ones', async () => {
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
      expect(sendMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'DeleteMessageBatch',
          args: expect.objectContaining({
            QueueUrl: 'http://queue-url',
            Entries: [{ Id: '2', ReceiptHandle: 'rh-2' }]
          })
        })
      )
    })

    test('leaves the message on the queue when ingest fails', async () => {
      sendMock.mockResolvedValueOnce({
        Messages: [{ MessageId: '1', ReceiptHandle: 'rh-1', Body: '{}' }]
      })
      ingestSqsMessage.mockRejectedValueOnce(new Error('db down'))

      await main(server, 'http://queue-url', undefined)

      expect(createApplicationRecordViaRoute).not.toHaveBeenCalled()
      expect(sendMock).toHaveBeenCalledTimes(1)
    })

    test('deletes without reprocessing a redelivery that was already processed', async () => {
      sendMock
        .mockResolvedValueOnce({
          Messages: [{ MessageId: '1', ReceiptHandle: 'rh-1', Body: '{}' }]
        })
        .mockResolvedValueOnce({})
      ingestSqsMessage.mockResolvedValueOnce({
        duplicate: true,
        processed: true
      })

      await main(server, 'http://queue-url', undefined)

      expect(createApplicationRecordViaRoute).not.toHaveBeenCalled()
      expect(sendMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'DeleteMessageBatch',
          args: expect.objectContaining({
            Entries: [{ Id: '1', ReceiptHandle: 'rh-1' }]
          })
        })
      )
    })

    test('records create-failed and keeps the message when creation throws', async () => {
      sendMock.mockResolvedValueOnce({
        Messages: [
          {
            MessageId: '1',
            ReceiptHandle: 'rh-1',
            Body: JSON.stringify({
              meta: { formSlug: 'x', referenceNumber: 'R', timestamp: 't' },
              data: {}
            })
          }
        ]
      })
      createApplicationRecordViaRoute.mockRejectedValueOnce(new Error('boom'))

      await main(server, 'http://queue-url', undefined)

      expect(markSqsMessageFailed).toHaveBeenCalledWith(
        server,
        '1',
        'create-failed'
      )
      expect(sendMock).toHaveBeenCalledTimes(1)
    })

    test('keeps going when recording the failure itself fails', async () => {
      sendMock.mockResolvedValueOnce({
        Messages: [
          {
            MessageId: '1',
            ReceiptHandle: 'rh-1',
            Body: JSON.stringify({
              meta: { formSlug: 'x', referenceNumber: 'R', timestamp: 't' },
              data: {}
            })
          }
        ]
      })
      createApplicationRecordViaRoute.mockRejectedValueOnce(new Error('boom'))
      markSqsMessageFailed.mockRejectedValueOnce(new Error('db down'))

      await expect(
        main(server, 'http://queue-url', undefined)
      ).resolves.toBeUndefined()
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
      expect(markSqsMessageProcessed).toHaveBeenCalledWith(server, 'msg-1', undefined)
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
      expect(markSqsMessageProcessed).toHaveBeenCalledWith(server, 'msg-2', undefined)
    })

    test('logs and returns early when the message body is invalid JSON', async () => {
      const message = { MessageId: 'msg-3', Body: 'not-json' }

      await createNewApplicationRecord(message, server)

      expect(createApplicationRecordViaRoute).not.toHaveBeenCalled()
      expect(markSqsMessageProcessed).not.toHaveBeenCalled()
      expect(markSqsMessageFailed).toHaveBeenCalledWith(
        server,
        'msg-3',
        'invalid-json'
      )
    })

    test('throws a no-appliances error when no repeaters are mapped', async () => {
      splitRepeaterJson.mockReturnValue([])
      const message = {
        MessageId: 'msg-4',
        Body: JSON.stringify({
          meta: {
            formSlug: 'apply-for-an-appliance',
            referenceNumber: 'REF-4',
            timestamp: 't'
          },
          data: {}
        })
      }

      await expect(
        createNewApplicationRecord(message, server)
      ).rejects.toMatchObject({ failureReason: 'no-appliances' })
      expect(createApplicationRecordViaRoute).not.toHaveBeenCalled()
      expect(markSqsMessageProcessed).not.toHaveBeenCalled()
    })
  })
})
