import { beforeEach, describe, test, expect, vi } from 'vitest'
import { createSqsMessage } from '../sqs-messages-controller.js'

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

describe('createSqsMessage - additional coverage', () => {
  let db
  let collection

  beforeEach(() => {
    vi.clearAllMocks()

    collection = {
      insertOne: vi.fn(async () => ({
        insertedId: 'mock-mongo-id',
        acknowledged: true
      }))
    }

    db = {
      collection: vi.fn(() => collection)
    }
  })

  test('returns notFound when SqsMessages collection does not exist', async () => {
    db = {
      collection: vi.fn(() => null)
    }

    const result = await createSqsMessage(
      db,
      {
        messageId: 'msg-123',
        messageBody: '{}'
      },
      mockLogger
    )

    expect(result).toEqual({
      success: false,
      message: 'SqsMessages collection not found',
      notFound: true
    })
  })

  test('stores mappedPayload string without parsing', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: '{}',
      mappedPayload: JSON.stringify({
        id: 'APP-001',
        status: 'approved'
      })
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedPayload: null,
        mappedPayload: payload.mappedPayload
      })
    )
  })

  test('stores invalid mappedPayload string unchanged', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: '{}',
      mappedPayload: '{invalid-json'
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(mockLogger.warn).not.toHaveBeenCalled()

    const insertedDoc = collection.insertOne.mock.calls[0][0]

    expect(insertedDoc.parsedPayload).toBeNull()
    expect(insertedDoc.mappedPayload).toBe('{invalid-json')
  })

  test('stores null values when mappedPayload is not provided', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: '{}'
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedPayload: null,
        mappedPayload: null
      })
    )
  })

  test('stores null values when mappedPayload is an empty string', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: '{}',
      mappedPayload: ''
    }

    await createSqsMessage(db, payload, mockLogger)

    const insertedDoc = collection.insertOne.mock.calls[0][0]

    expect(insertedDoc.parsedPayload).toBeNull()
    expect(insertedDoc.mappedPayload).toBeNull()
  })

  test('stores parsedMessageBody and mappedPayload separately', async () => {
    const parsedMessageBody = {
      foo: 'bar',
      count: 1
    }

    const mappedPayload = JSON.stringify({
      transformed: true
    })

    await createSqsMessage(
      db,
      {
        messageId: 'msg-123',
        messageBody: '{}',
        parsedMessageBody,
        mappedPayload
      },
      mockLogger
    )

    const insertedDoc = collection.insertOne.mock.calls[0][0]

    expect(insertedDoc.parsedPayload).toEqual(parsedMessageBody)
    expect(insertedDoc.mappedPayload).toBe(mappedPayload)
  })
})
