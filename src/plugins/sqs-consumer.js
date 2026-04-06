import { main, sqsClient } from '../sqs/client.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

export default {
  name: 'sqsConsumer',
  register: async function (server) {
    logger.info('SQS Consumer plugin initializing...')
    const abortController = new AbortController()

    // Expose controller so other parts of system can trigger stop if needed
    server.app.sqsAbortController = abortController
    logger.info('SQS abort controller registered with server')

    // Background loop
    const poll = async () => {
      logger.info('Starting SQS polling loop...')
      let pollCount = 0
      while (!abortController.signal.aborted) {
        pollCount++
        logger.debug(`SQS poll iteration #${pollCount}`)
        await main(server, undefined, abortController.signal)
        await new Promise((resolve) => setTimeout(resolve, 500)) // small sleep for 15 minute user wait time, adjust as needed- 15 * 60 * 1000
      }
      logger.info('SQS polling loop stopped')
    }

    poll()

    // Graceful shutdown
    server.events.on('stop', () => {
      logger.info('Hapi server stopping → halting SQS consumer...')
      abortController.abort() //Stop long polling immediately and Stop background loop
      sqsClient.destroy() //Close open HTTP sockets,Force Node to exit cleanly and Prevent memory leaks over time
      logger.info('SQS consumer shutdown complete')
    })
    logger.info('SQS Consumer plugin initialized successfully')
  }
}
