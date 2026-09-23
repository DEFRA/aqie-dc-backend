/**
 * SQS Messages Controller
 * Business logic for handling/storing payload (body) of SQS messages in the database for debugging and backup purposes.
 */
async function createSqsMessage(db, payload, logger) {
  try {
    const collection = db.collection('SqsMessages')
    const now = new Date()

    //the payload contains the messageBody and messageId. The messageBody is the raw payload of the SQS message and the messageId is the unique identifier of the SQS message.
    const { messageId, messageBody } = payload

    // Insert into database
    const result = await collection.insertOne({
      _id: messageId, //so Mongo rejects duplicate inserts on redelivery
      receivedAt: now,
      rawPayload: messageBody,
      processed: false // true once the message has been mapped and saved as an application record
    })

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
      { $set: { processed: true } }
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

export { createSqsMessage, markMessageProcessed }
