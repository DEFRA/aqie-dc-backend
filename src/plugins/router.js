import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { uploadCallback } from '../routes/upload-callback.js'
import {
  initiateImportController,
  checkUploadStatusController,
  adminImportPageController
} from '../routes/admin-import.js'
import { test } from '../dc/routes/test.js'
import Inert from '@hapi/inert'

const router = {
  plugin: {
    name: 'router',
    register: async (server, _options) => {
      // Register @hapi/inert for static file serving
      await server.register(Inert)

      // Health check, example, and test routes
      const testRoutes = [test]
      const baseRoutes = [health].concat(example).concat(testRoutes)
      server.route(baseRoutes)

      // CDP Uploader callback route
      server.route(uploadCallback)

      // Admin import routes
      server.route([
        {
          method: 'GET',
          path: '/admin/import',
          ...adminImportPageController
        },
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
    }
  }
}

export { router }
