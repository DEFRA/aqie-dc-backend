import { beforeEach, describe, test, expect, vi } from 'vitest'
import {
  createSqsMessage,
  markMessageProcessed,
  markMessageFailed
} from '#src/controllers/sqs-messages-controller.js'

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

  test('stores messageId as _id, rawPayload as messageBody, and defaults processed to false', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: '{}'
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'msg-123',
        rawPayload: '{}',
        processed: false
      })
    )
  })

  test('stores sentTimestamp as sentAt when provided', async () => {
    const payload = {
      messageId: 'msg-123',
      messageBody: '{}',
      sentTimestamp: '1727000000000'
    }

    await createSqsMessage(db, payload, mockLogger)

    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'msg-123',
        sentAt: new Date(Number(payload.sentTimestamp))
      })
    )
  })
})

describe('markMessageProcessed', () => {
  let db
  let collection

  beforeEach(() => {
    vi.clearAllMocks()

    collection = {
      updateOne: vi.fn(async () => ({ acknowledged: true }))
    }

    db = {
      collection: vi.fn(() => collection)
    }
  })

  test('sets processed to true and clears failure fields', async () => {
    const result = await markMessageProcessed(db, 'msg-123', mockLogger)

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: 'msg-123' },
      {
        $set: { processed: true },
        $unset: { failureReason: '', failedAt: '' }
      }
    )
    expect(result).toEqual({ success: true })
  })

  test('throws when the update is not acknowledged', async () => {
    collection.updateOne.mockResolvedValueOnce({ acknowledged: false })

    await expect(
      markMessageProcessed(db, 'msg-123', mockLogger)
    ).rejects.toThrow('Failed to update sqs message')
  })
})

describe('markMessageFailed', () => {
  test('sets failureReason and failedAt', async () => {
    const collection = {
      updateOne: vi.fn(async () => ({ acknowledged: true }))
    }
    const db = { collection: vi.fn(() => collection) }

    const result = await markMessageFailed(
      db,
      'msg-123',
      'no-appliances',
      mockLogger
    )

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: 'msg-123' },
      { $set: { failureReason: 'no-appliances', failedAt: expect.any(Date) } }
    )
    expect(result).toEqual({ success: true })
  })
})

describe('markMessageFailed', () => {
  test('sets failureReason and failedAt', async () => {
    const collection = {
      updateOne: vi.fn(async () => ({ acknowledged: true }))
    }
    const db = { collection: vi.fn(() => collection) }

    const result = await markMessageFailed(
      db,
      'msg-123',
      'no-appliances',
      mockLogger
    )

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: 'msg-123' },
      {
        $set: { failureReason: 'no-appliances', failedAt: expect.any(Date) }
      }
    )
    expect(result).toEqual({ success: true })
  })
})
