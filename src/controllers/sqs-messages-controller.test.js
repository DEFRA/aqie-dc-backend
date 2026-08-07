import { beforeEach, describe, test, expect, vi } from 'vitest'
import { createSqsMessage } from './sqs-messages-controller.js'

const mockLogger = {
  info: vi.fn(),
  error: vi.fn()
}

describe('createSqsMessage', () => {
  let db
  let collection

  beforeEach(() => {
    vi.clearAllMocks()

    collection = {
      insertOne: vi.fn(async (doc) => ({
        insertedId: 'mock-mongo-id',
        acknowledged: true
      }))
    }

    db = {
      collection: vi.fn(() => collection)
    }
  })

  test('stores sqs message and returns success response', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: JSON.stringify({
        applianceId: 'APP-001',
        status: 'approved'
      }),
      mappedPayload: {
        applianceId: 'APP-001'
      }
    }

    const result = await createSqsMessage(db, payload, mockLogger)

    expect(result).toEqual({
      success: true,
      message: 'Sqs message stored successfully',
      _id: 'mock-mongo-id'
    })

    expect(collection.insertOne).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith('Sqs message stored: msg-123')
  })

  test('stores expected document structure', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: JSON.stringify({
        test: true
      }),
      mappedPayload: {
        test: true
      }
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'msg-123',
        rawPayload: payload.messageBody,
        parsedPayload: {
          test: true
        },
        mappedPayload: {
          test: true
        },
        receivedAt: expect.any(Date)
      })
    )
  })

  test('parses json messageBody before storing', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: JSON.stringify({
        foo: 'bar',
        count: 1
      }),
      mappedPayload: {}
    }

    await createSqsMessage(db, payload, mockLogger)

    const insertedDoc = collection.insertOne.mock.calls[0][0]

    expect(insertedDoc.parsedPayload).toEqual({
      foo: 'bar',
      count: 1
    })
  })

  test('throws error when insertOne is not acknowledged', async () => {
    collection.insertOne = vi.fn(async () => ({
      acknowledged: false
    }))

    const payload = {
      messageId: 'msg-123',
      messageBody: JSON.stringify({ test: true }),
      mappedPayload: {}
    }

    await expect(createSqsMessage(db, payload, mockLogger)).rejects.toThrow(
      'Failed to insert sqs message'
    )

    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('throws error when database insert fails', async () => {
    collection.insertOne = vi.fn().mockRejectedValueOnce(new Error('DB error'))

    const payload = {
      messageId: 'msg-123',
      messageBody: JSON.stringify({ test: true }),
      mappedPayload: {}
    }

    await expect(createSqsMessage(db, payload, mockLogger)).rejects.toThrow(
      'DB error'
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to store sqs message, no backup of the message was made'
    )
  })

  test('throws error when messageBody contains invalid json', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: '{invalid-json',
      mappedPayload: {}
    }

    await expect(createSqsMessage(db, payload, mockLogger)).rejects.toThrow()

    expect(collection.insertOne).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('uses messageId as stored id', async () => {
    const payload = {
      messageId: 'unique-message-id',
      messageBody: JSON.stringify({ test: true }),
      mappedPayload: {}
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'unique-message-id'
      })
    )
  })

  test('stores provided mappedPayload', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: JSON.stringify({ original: true }),
      mappedPayload: {
        transformed: true,
        applianceId: 'APP-001'
      }
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        mappedPayload: {
          transformed: true,
          applianceId: 'APP-001'
        }
      })
    )
  })
})
