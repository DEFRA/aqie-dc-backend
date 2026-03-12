import { main, sqsClient } from '../sqs/client.js'

export default {
  name: 'sqsConsumer',
  register: async function (server) {
    const abortController = new AbortController()
    let keepRunning = true

    // Expose controller so other parts of system can trigger stop if needed
    server.app.sqsAbortController = abortController

    // Background loop
    const poll = async () => {
      while (keepRunning) {
        await main(undefined, abortController.signal)
        await new Promise((res) => setTimeout(res, 500)) // small sleep
      }
    }

    poll()

    // Graceful shutdown
    server.events.on('stop', () => {
      console.log('Hapi server stopping → halting SQS consumer...')
      keepRunning = false
      abortController.abort() //Stop long polling immediately and Stop background loop
      sqsClient.destroy() //Close open HTTP sockets,Force Node to exit cleanly and Prevent memory leaks over time
    })
  }
}
