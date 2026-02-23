import { beforeEach, describe, test, expect, vi, afterEach } from 'vitest'

describe('#config', () => {
  let originalEnv

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env }
    delete process.env.MONGO_URI
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    // Clear module cache to allow fresh imports
    vi.resetModules()
  })

  describe('Default values', () => {
    test('Should have expected default service name', async () => {
      const { config } = await import('./config.js')
      expect(config.get('serviceName')).toBe('aqie-dc-backend')
    })

    test('Should have default host', async () => {
      const { config } = await import('./config.js')
      expect(config.get('host')).toBe('0.0.0.0')
    })

    test('Should have default port', async () => {
      const { config } = await import('./config.js')
      expect(config.get('port')).toBe(3001)
    })

    test('Should have default cdpEnvironment as local', async () => {
      const { config } = await import('./config.js')
      expect(config.get('cdpEnvironment')).toBe('local')
    })

    test('Should have default mongo URI', async () => {
      const { config } = await import('./config.js')
      expect(config.get('mongo.mongoUrl')).toBe('mongodb://127.0.0.1:27017/')
    })

    test('Should have default database name', async () => {
      const { config } = await import('./config.js')
      expect(config.get('mongo.databaseName')).toBe('aqie-dc-backend')
    })

    test('Should have default AWS region', async () => {
      const { config } = await import('./config.js')
      expect(config.get('aws.region')).toBe('eu-west-2')
    })
  })

  describe('Environment variable overrides', () => {
    test('Should override port from PORT env var', async () => {
      process.env.PORT = '8080'
      const { config } = await import('./config.js')
      expect(config.get('port')).toBe(8080)
    })

    test('Should override host from HOST env var', async () => {
      process.env.HOST = '127.0.0.1'
      const { config } = await import('./config.js')
      expect(config.get('host')).toBe('127.0.0.1')
    })

    test('Should override MONGO_URI from env var', async () => {
      process.env.MONGO_URI = 'mongodb://custom-host:27017/'
      const { config } = await import('./config.js')
      expect(config.get('mongo.mongoUrl')).toBe('mongodb://custom-host:27017/')
    })

    test('Should override MONGO_DATABASE from env var', async () => {
      process.env.MONGO_DATABASE = 'custom-db'
      const { config } = await import('./config.js')
      expect(config.get('mongo.databaseName')).toBe('custom-db')
    })

    test('Should override cdpEnvironment from ENVIRONMENT env var', async () => {
      process.env.ENVIRONMENT = 'dev'
      const { config } = await import('./config.js')
      expect(config.get('cdpEnvironment')).toBe('dev')
    })

    test('Should override CDP_UPLOADER_URL from env var', async () => {
      process.env.CDP_UPLOADER_URL = 'https://custom-uploader.com'
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.url')).toBe('https://custom-uploader.com')
    })

    test('Should override CDP_UPLOADER_S3_BUCKET from env var', async () => {
      process.env.CDP_UPLOADER_S3_BUCKET = 'custom-bucket'
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.s3Bucket')).toBe('custom-bucket')
    })

    test('Should override AWS_REGION from env var', async () => {
      process.env.AWS_REGION = 'us-east-1'
      const { config } = await import('./config.js')
      expect(config.get('aws.region')).toBe('us-east-1')
    })

    test('Should override LOG_LEVEL from env var', async () => {
      process.env.LOG_LEVEL = 'debug'
      const { config } = await import('./config.js')
      expect(config.get('log.level')).toBe('debug')
    })

    test('Should override LOG_FORMAT from env var', async () => {
      process.env.LOG_FORMAT = 'ecs'
      const { config } = await import('./config.js')
      expect(config.get('log.format')).toBe('ecs')
    })

    test('Should override ENABLE_METRICS from env var', async () => {
      process.env.ENABLE_METRICS = 'true'
      const { config } = await import('./config.js')
      expect(config.get('isMetricsEnabled')).toBe(true)
    })

    test('Should override HTTP_PROXY from env var', async () => {
      process.env.HTTP_PROXY = 'http://proxy.example.com:8080'
      const { config } = await import('./config.js')
      expect(config.get('httpProxy')).toBe('http://proxy.example.com:8080')
    })
  })

  describe('Environment-dependent behavior', () => {
    test('Should disable logging in test environment', async () => {
      process.env.NODE_ENV = 'test'
      const { config } = await import('./config.js')
      expect(config.get('log.isEnabled')).toBe(false)
    })

    test('Should enable logging in non-test environment', async () => {
      process.env.NODE_ENV = 'development'
      const { config } = await import('./config.js')
      expect(config.get('log.isEnabled')).toBe(true)
    })

    test('Should use ecs log format in production', async () => {
      process.env.NODE_ENV = 'production'
      const { config } = await import('./config.js')
      expect(config.get('log.format')).toBe('ecs')
    })

    test('Should use pino-pretty log format in non-production', async () => {
      process.env.NODE_ENV = 'development'
      const { config } = await import('./config.js')
      expect(config.get('log.format')).toBe('pino-pretty')
    })

    test('Should enable metrics in production', async () => {
      process.env.NODE_ENV = 'production'
      const { config } = await import('./config.js')
      expect(config.get('isMetricsEnabled')).toBe(true)
    })

    test('Should disable metrics in non-production', async () => {
      process.env.NODE_ENV = 'development'
      const { config } = await import('./config.js')
      expect(config.get('isMetricsEnabled')).toBe(false)
    })

    test('Should redact sensitive fields in production', async () => {
      process.env.NODE_ENV = 'production'
      const { config } = await import('./config.js')
      const redact = config.get('log.redact')
      expect(redact).toContain('req.headers.authorization')
      expect(redact).toContain('req.headers.cookie')
      expect(redact).toContain('res.headers')
    })

    test('Should redact different fields in non-production', async () => {
      process.env.NODE_ENV = 'development'
      const { config } = await import('./config.js')
      const redact = config.get('log.redact')
      expect(redact).toContain('req')
      expect(redact).toContain('res')
      expect(redact).toContain('responseTime')
    })
  })

  describe('CDP Uploader URL construction', () => {
    test('Should use localhost URL for local environment', async () => {
      process.env.ENVIRONMENT = 'local'
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.url')).toBe('http://localhost:7337')
    })

    test('Should construct URL for dev environment', async () => {
      process.env.ENVIRONMENT = 'dev'
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.url')).toBe(
        'https://cdp-uploader.dev.cdp-int.defra.cloud'
      )
    })

    test('Should construct URL for test environment', async () => {
      process.env.ENVIRONMENT = 'test'
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.url')).toBe(
        'https://cdp-uploader.test.cdp-int.defra.cloud'
      )
    })

    test('Should construct URL for prod environment', async () => {
      process.env.ENVIRONMENT = 'prod'
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.url')).toBe(
        'https://cdp-uploader.prod.cdp-int.defra.cloud'
      )
    })

    test('Should construct URL for infra-dev environment', async () => {
      process.env.ENVIRONMENT = 'infra-dev'
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.url')).toBe(
        'https://cdp-uploader.infra-dev.cdp-int.defra.cloud'
      )
    })
  })

  describe('CDP Uploader configuration', () => {
    test('Should have expected default max file size', async () => {
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.maxFileSize')).toBe(10485760) // 10MB
    })

    test('Should have expected default allowed MIME types', async () => {
      const { config } = await import('./config.js')
      const mimeTypes = config.get('cdpUploader.allowedMimeTypes')
      expect(mimeTypes).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      expect(mimeTypes).toContain('application/vnd.ms-excel')
    })

    test('Should have expected default S3 prefix', async () => {
      const { config } = await import('./config.js')
      expect(config.get('cdpUploader.s3Prefix')).toBe('imports')
    })
  })

  describe('Tracing configuration', () => {
    test('Should have default tracing header', async () => {
      const { config } = await import('./config.js')
      expect(config.get('tracing.header')).toBe('x-cdp-request-id')
    })

    test('Should override tracing header from env var', async () => {
      process.env.TRACING_HEADER = 'x-custom-trace-id'
      const { config } = await import('./config.js')
      expect(config.get('tracing.header')).toBe('x-custom-trace-id')
    })
  })

  describe('Validation', () => {
    test('Should accept valid port number', async () => {
      process.env.PORT = '3000'
      const { config } = await import('./config.js')
      expect(config.get('port')).toBe(3000)
    })

    test('Should accept valid IP address', async () => {
      process.env.HOST = '192.168.1.1'
      const { config } = await import('./config.js')
      expect(config.get('host')).toBe('192.168.1.1')
    })

    test('Should accept valid cdpEnvironment value', async () => {
      const validEnvironments = [
        'local',
        'infra-dev',
        'management',
        'dev',
        'test',
        'perf-test',
        'ext-test',
        'prod'
      ]

      for (const env of validEnvironments) {
        process.env.ENVIRONMENT = env
        vi.resetModules()
        const { config } = await import('./config.js')
        expect(config.get('cdpEnvironment')).toBe(env)
      }
    })

    test('Should accept valid log level', async () => {
      const validLevels = [
        'fatal',
        'error',
        'warn',
        'info',
        'debug',
        'trace',
        'silent'
      ]

      for (const level of validLevels) {
        process.env.LOG_LEVEL = level
        vi.resetModules()
        const { config } = await import('./config.js')
        expect(config.get('log.level')).toBe(level)
      }
    })

    test('Should accept valid mongo read preference', async () => {
      const validPreferences = [
        'primary',
        'primaryPreferred',
        'secondary',
        'secondaryPreferred',
        'nearest'
      ]

      for (const pref of validPreferences) {
        process.env.MONGO_READ_PREFERENCE = pref
        vi.resetModules()
        const { config } = await import('./config.js')
        expect(config.get('mongo.mongoOptions.readPreference')).toBe(pref)
      }
    })
  })

  describe('Nullable values', () => {
    test('Should allow null serviceVersion', async () => {
      const { config } = await import('./config.js')
      expect(config.get('serviceVersion')).toBe(null)
    })

    test('Should allow null httpProxy', async () => {
      const { config } = await import('./config.js')
      expect(config.get('httpProxy')).toBe(null)
    })

    test('Should allow null mongo retryWrites', async () => {
      const { config } = await import('./config.js')
      expect(config.get('mongo.mongoOptions.retryWrites')).toBe(null)
    })

    test('Should allow null mongo readPreference', async () => {
      const { config } = await import('./config.js')
      expect(config.get('mongo.mongoOptions.readPreference')).toBe(null)
    })

    test('Should set serviceVersion from env var', async () => {
      process.env.SERVICE_VERSION = '1.2.3'
      const { config } = await import('./config.js')
      expect(config.get('serviceVersion')).toBe('1.2.3')
    })
  })

  describe('Boolean values', () => {
    test('Should handle MONGO_RETRY_WRITES as boolean', async () => {
      process.env.MONGO_RETRY_WRITES = 'true'
      const { config } = await import('./config.js')
      expect(config.get('mongo.mongoOptions.retryWrites')).toBe(true)
    })

    test('Should handle LOG_ENABLED as boolean', async () => {
      process.env.LOG_ENABLED = 'false'
      const { config } = await import('./config.js')
      expect(config.get('log.isEnabled')).toBe(false)
    })

    test('Should handle ENABLE_METRICS as boolean', async () => {
      process.env.ENABLE_METRICS = 'false'
      const { config } = await import('./config.js')
      expect(config.get('isMetricsEnabled')).toBe(false)
    })
  })

  describe('Sensitive data', () => {
    test('Should have cdpXApiKey field', async () => {
      const { config } = await import('./config.js')
      expect(config.get('cdpXApiKey')).toBe('')
    })

    test('Should override cdpXApiKey from env var', async () => {
      process.env.CDP_X_API_KEY = 'secret-key-123'
      const { config } = await import('./config.js')
      expect(config.get('cdpXApiKey')).toBe('secret-key-123')
    })
  })
})
