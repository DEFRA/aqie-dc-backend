/**
 * SQS Messages Controller
 * Business logic for handling/storing payload (body) of SQS messages in the database for debugging and backup purposes.
 */

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

    //the payload contains the messageBody, messageId, and mappedPayload. The messageBody is the raw payload of the SQS message, the messageId is the unique identifier of the SQS message, and the mappedPayload is the pre-processed version of the messageBody.
    const { messageId, messageBody, mappedPayload } = payload

    // Insert into database
    const result = await collection.insertOne({
      id: messageId, //do i need this? can i guaraentee it will be unique? should i use the mongo _id instead? or both?
      receivedAt: now, //should/can i pull this out of the sqs message? should it be createdAt, what exaclty am i storing here?
      rawPayload: messageBody,
      parsedPayload: JSON.parse(messageBody),
      mappedPayload
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
