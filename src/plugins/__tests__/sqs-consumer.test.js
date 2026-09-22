import { describe, test, expect, vi, beforeEach } from 'vitest'

const mainMock = vi.fn()
const destroyMock = vi.fn()

vi.mock('../../sqs/client.js', () => ({
  main: mainMock,
  sqsClient: { destroy: destroyMock }
}))

vi.mock('../../config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'aws.sqs.pollIntervalMins') {
        return 0
      }
      return undefined
    })
  }
}))

const sqsConsumer = (await import('../sqs-consumer.js')).default

describe('sqsConsumer plugin', () => {
  let server

  beforeEach(() => {
    vi.clearAllMocks()
    server = {
      app: {},
      events: { on: vi.fn() }
    }
  })

  test('exposes an AbortController via server.app.sqsAbortController', async () => {
    mainMock.mockImplementation(async (_server, _queueUrl, signal) => {
      // Abort immediately so the polling loop exits after one iteration
      if (!signal.aborted) {
        server.app.sqsAbortController.abort()
      }
    })

    await sqsConsumer.register(server)

    expect(server.app.sqsAbortController).toBeInstanceOf(AbortController)
    expect(mainMock).toHaveBeenCalled()
  })

  test('registers a stop event handler that aborts polling and destroys the client', async () => {
    mainMock.mockImplementation(async (_server, _queueUrl, signal) => {
      if (!signal.aborted) {
        server.app.sqsAbortController.abort()
      }
    })

    await sqsConsumer.register(server)

    expect(server.events.on).toHaveBeenCalledWith('stop', expect.any(Function))

    const stopHandler = server.events.on.mock.calls[0][1]
    stopHandler()

    expect(destroyMock).toHaveBeenCalled()
  })
})
