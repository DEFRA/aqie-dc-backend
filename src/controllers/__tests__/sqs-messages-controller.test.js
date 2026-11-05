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

  test('rethrows and logs when the update fails', async () => {
    collection.updateOne.mockRejectedValueOnce(new Error('db down'))

    await expect(
      markMessageProcessed(db, 'msg-123', mockLogger)
    ).rejects.toThrow('db down')
    expect(mockLogger.error).toHaveBeenCalled()
  })
})

describe('markMessageFailed', () => {
  let collection
  let db

  beforeEach(() => {
    vi.clearAllMocks()
    collection = { updateOne: vi.fn(async () => ({ acknowledged: true })) }
    db = { collection: vi.fn(() => collection) }
  })

  test('sets failureReason and failedAt', async () => {
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

  test('throws and logs when the update is not acknowledged', async () => {
    collection.updateOne.mockResolvedValueOnce({ acknowledged: false })

    await expect(
      markMessageFailed(db, 'msg-123', 'no-appliances', mockLogger)
    ).rejects.toThrow('Failed to update sqs message')
    expect(mockLogger.error).toHaveBeenCalled()
  })
})

describe('createSqsMessage - redelivery and errors', () => {
  let collection
  let db

  beforeEach(() => {
    vi.clearAllMocks()
    collection = {
      insertOne: vi.fn(),
      findOne: vi.fn()
    }
    db = { collection: vi.fn(() => collection) }
  })

  const payload = { messageId: 'msg-1', messageBody: '{}' }

  test.each([
    [true, true],
    [false, false]
  ])(
    'reports duplicate with processed=%s when stored processed=%s',
    async (stored, expected) => {
      collection.insertOne.mockRejectedValueOnce({ code: 11000 })
      collection.findOne.mockResolvedValueOnce({ processed: stored })

      const result = await createSqsMessage(db, payload, mockLogger)

      expect(result).toEqual(
        expect.objectContaining({ duplicate: true, processed: expected })
      )
    }
  )

  test('rethrows non-duplicate insert errors', async () => {
    collection.insertOne.mockRejectedValueOnce(new Error('db down'))

    await expect(createSqsMessage(db, payload, mockLogger)).rejects.toThrow(
      'db down'
    )
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('throws when the insert is not acknowledged', async () => {
    collection.insertOne.mockResolvedValueOnce({ acknowledged: false })

    await expect(createSqsMessage(db, payload, mockLogger)).rejects.toThrow(
      'Failed to insert sqs message'
    )
  })
})
