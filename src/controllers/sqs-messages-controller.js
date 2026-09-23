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
    // Use SQS messageId as _id so Mongo rejects duplicate inserts on redelivery
    const result = await collection.insertOne({
      _id: messageId,
      receivedAt: now, //should/can i pull this out of the sqs message? should it be createdAt, what exaclty am i storing here?
      rawPayload: messageBody
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

export { createSqsMessage }
