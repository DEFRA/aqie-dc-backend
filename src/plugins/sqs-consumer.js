import { main, sqsClient } from '../sqs/client.js'

export default {
  name: 'sqsConsumer',
  register: async function (server) {
    const abortController = new AbortController()

    // Expose controller so other parts of system can trigger stop if needed
    server.app.sqsAbortController = abortController

    // Background loop
    const poll = async () => {
      while (!abortController.signal.aborted) {
        await main(server, undefined, abortController.signal)
        await new Promise((resolve) => setTimeout(resolve, 60 * 60 * 1000)) // 60 minutes between polls
      }
    }

    poll()

    // Graceful shutdown
    server.events.on('stop', () => {
      console.log('Hapi server stopping → halting SQS consumer...')
      abortController.abort() //Stop long polling immediately and Stop background loop
      sqsClient.destroy() //Close open HTTP sockets,Force Node to exit cleanly and Prevent memory leaks over time
    })
  }
}
