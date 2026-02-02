import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { uploadCallback } from '../routes/upload-callback.js'
import {
  initiateImportController,
  checkUploadStatusController
} from '../routes/admin-import.js'
import { test } from '../dc/routes/test.js'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'
import { config } from '../config.js'

const router = {
  plugin: {
    name: 'router',
    register: async (server, _options) => {
      // Register @hapi/inert for static file serving
      await server.register(Inert)

      // Register @hapi/h2o2 for proxying
      await server.register(H2o2)

      // Health check, example, and test routes
      const testRoutes = [test]
      const baseRoutes = [health].concat(example).concat(testRoutes)
      server.route(baseRoutes)

      // CDP Uploader callback route
      server.route(uploadCallback)

      // Admin import routes
      server.route([
        {
          method: 'POST',
          path: '/admin/import/initiate',
          ...initiateImportController
        },
        {
          method: 'GET',
          path: '/admin/import/status',
          ...checkUploadStatusController
        },
        {
          method: 'GET',
          path: '/templates/{file*}',
          handler: {
            directory: {
              path: 'templates',
              redirectToSlash: true,
              index: false
            }
          }
        }
      ])

      // Proxy route for CDP Uploader upload endpoint
      server.route({
        method: 'POST',
        path: '/admin/upload-and-scan/{uploadId}',
        options: {
          auth: false,
          payload: {
            output: 'stream',
            parse: false,
            maxBytes: config.get('cdpUploader.maxFileSize')
          }
        },
        handler: {
          proxy: {
            mapUri: (request) => {
              const { uploadId } = request.params
              const cdpUploaderUrl = config.get('cdpUploader.url')
              return {
                uri: `${cdpUploaderUrl}/upload-and-scan/${uploadId}`
              }
            },
            passThrough: true,
            xforward: true
          }
        }
      })
    }
  }
}

export { router }
