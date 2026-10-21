/**
 * SQS Messages Controller
 * Business logic for handling/storing payload (body) of SQS messages in the database for debugging and backup purposes.
 */
const DUPLICATE_KEY_ERROR = 11000

async function createSqsMessage(db, payload, logger) {
  try {
    const collection = db.collection('SqsMessages')

    if (!collection) {
      return {
        success: false,
        message: 'SqsMessages collection not found',
        notFound: true
      }
    }

    const now = new Date()

    //the payload contains the messageBody and messageId. The messageBody is the raw payload of the SQS message and the messageId is the unique identifier of the SQS message.
    const { messageId, messageBody, sentTimestamp } = payload
    const sentAt = sentTimestamp ? new Date(Number(sentTimestamp)) : undefined

    let result
    try {
      result = await collection.insertOne({
        _id: messageId, //so Mongo rejects duplicate inserts on redelivery
        receivedAt: now,
        ...(sentAt && { sentAt }),
        rawPayload: messageBody,
        processed: false // true once the message has been mapped and saved as an application record
      })
    } catch (insertError) {
      if (insertError?.code !== DUPLICATE_KEY_ERROR) {
        throw insertError
      }
      // Redelivery: report whether it was fully handled last time
      const existing = await collection.findOne({ _id: messageId })
      logger.info(`Sqs message ${messageId} already stored (redelivery)`)
      return {
        success: true,
        duplicate: true,
        processed: existing?.processed === true,
        message: 'Sqs message already stored',
        _id: messageId
      }
    }

    if (!result.acknowledged) {
      throw new Error('Failed to insert sqs message')
    }

    logger.info(`Sqs message stored: ${messageId}`)

    return {
      success: true,
      message: 'Sqs message stored successfully',
      _id: result.insertedId
    }
  } catch (error) {
    logger.error(
      error,
      `Failed to store sqs message, no backup of the message was made`
    )
    throw error
  }
}

async function markMessageProcessed(db, messageId, logger) {
  try {
    const collection = db.collection('SqsMessages')

    const result = await collection.updateOne(
      { _id: messageId },
      {
        $set: { processed: true },
        $unset: { failureReason: '', failedAt: '' }
      }
    )

    if (!result.acknowledged) {
      throw new Error('Failed to update sqs message')
    }

    return { success: true }
  } catch (error) {
    logger.error(error, `Failed to mark sqs message ${messageId} as processed`)
    throw error
  }
}

// Records why a message could not be mapped so failures are queryable
async function markMessageFailed(db, messageId, failureReason, logger) {
  try {
    const collection = db.collection('SqsMessages')

    const result = await collection.updateOne(
      { _id: messageId },
      { $set: { failureReason, failedAt: new Date() } }
    )

    if (!result.acknowledged) {
      throw new Error('Failed to update sqs message')
    }

    return { success: true }
  } catch (error) {
    logger.error(error, `Failed to mark sqs message ${messageId} as failed`)
    throw error
  }
}

export { createSqsMessage, markMessageProcessed, markMessageFailed }
