import { config } from '../config.js'
import { main, sqsClient } from '../sqs/client.js'

export default {
  name: 'sqsConsumer',
  register: async function (server) {
    const abortController = new AbortController()

    server.app.sqsAbortController = abortController

    const poll = async () => {
      while (!abortController.signal.aborted) {
        await main(server, undefined, abortController.signal)

        const pollIntervalMins = Number(config.get('aws.sqs.pollIntervalMins'))

        if (!Number.isFinite(pollIntervalMins) || pollIntervalMins <= 0) {
          throw new Error('aws.sqs.pollIntervalMins must be a positive number')
        }

        const pollIntervalMs = pollIntervalMins * 60 * 1000
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      }
    }

    void poll().catch((err) => {
      server.logger?.error({ err }, 'SQS poll loop failed')
    })

    server.events.on('stop', () => {
      server.logger?.info('Hapi server stopping → halting SQS consumer...')
      abortController.abort()
      sqsClient.destroy()
    })
  }
}
