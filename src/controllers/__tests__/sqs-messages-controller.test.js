import { beforeEach, describe, test, expect, vi } from 'vitest'
import { createSqsMessage } from '#src/controllers/sqs-messages-controller.js'

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

  test('stores messageId as _id and rawPayload as messageBody', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: '{}'
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'msg-123',
        rawPayload: '{}'
      })
    )
  })
})
