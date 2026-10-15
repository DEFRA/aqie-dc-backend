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
        return 1
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
      events: { on: vi.fn() },
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('starts polling once the server starts and exposes an AbortController', async () => {
    let startHandler

    server.events.on.mockImplementation((eventName, handler) => {
      if (eventName === 'start') {
        startHandler = handler
      }
    })

    mainMock.mockImplementation(async (_server, _queueUrl, signal) => {
      if (!signal.aborted) {
        server.app.sqsAbortController.abort()
      }
    })

    await sqsConsumer.register(server)
    startHandler()

    expect(server.app.sqsAbortController).toBeInstanceOf(AbortController)
    expect(mainMock).toHaveBeenCalled()
  })

  test('registers a stop event handler that aborts polling and destroys the client', async () => {
    const stopHandler = vi.fn()

    server.events.on.mockImplementation((eventName, handler) => {
      if (eventName === 'stop') {
        stopHandler.mockImplementation(handler)
      }
    })

    mainMock.mockImplementation(async (_server, _queueUrl, signal) => {
      if (!signal.aborted) {
        server.app.sqsAbortController.abort()
      }
    })

    await sqsConsumer.register(server)
    stopHandler()

    expect(destroyMock).toHaveBeenCalled()
  })

  test('throws when the poll interval is invalid at startup', async () => {
    vi.resetModules()
    vi.doMock('../../config.js', () => ({
      config: {
        get: vi.fn((key) => {
          if (key === 'aws.sqs.pollIntervalMins') {
            return 0
          }
          return undefined
        })
      }
    }))

    const invalidSqsConsumer = (await import('../sqs-consumer.js')).default

    await expect(invalidSqsConsumer.register(server)).rejects.toThrow(
      'aws.sqs.pollIntervalMins must be a positive number'
    )

    vi.doUnmock('../../config.js')
    vi.resetModules()
  })
})
