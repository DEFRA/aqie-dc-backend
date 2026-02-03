import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { uploadCallback } from '../routes/upload-callback.js'
import {
  initiateImportController,
  checkUploadStatusController
} from '../routes/admin-import.js'
import { getAllUsers } from '../routes/users/get-all-users.js'
import { getUserById } from '../routes/users/get-user-by-id.js'
import { getUserWithRelations } from '../routes/users/get-user-with-relations.js'
import { searchUsers } from '../routes/users/search-users.js'
import { getAllAppliances } from '../routes/appliances/get-all-appliances.js'
import { getApplianceById } from '../routes/appliances/get-appliance-by-id.js'
import { getApplianceWithUsers } from '../routes/appliances/get-appliance-with-users.js'
import { searchAppliances } from '../routes/appliances/search-appliances.js'
import { getAllFuels } from '../routes/fuels/get-all-fuels.js'
import { getFuelById } from '../routes/fuels/get-fuel-by-id.js'
import { getFuelWithUsers } from '../routes/fuels/get-fuel-with-users.js'
import { searchFuels } from '../routes/fuels/search-fuels.js'
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
      // Note: This route does NOT include the service name prefix
      // The gateway strips /aqie-dc-backend before routing to this service
      server.route({
        method: 'POST',
        path: '/upload-and-scan/{uploadId}',
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

      // User API routes
      server.route([
        getAllUsers,
        searchUsers, // Must come before getUserById to avoid route conflict
        getUserById,
        getUserWithRelations
      ])

      // Appliance API routes
      server.route([
        getAllAppliances,
        searchAppliances, // Must come before getApplianceById to avoid route conflict
        getApplianceById,
        getApplianceWithUsers
      ])

      // Fuel API routes
      server.route([
        getAllFuels,
        searchFuels, // Must come before getFuelById to avoid route conflict
        getFuelById,
        getFuelWithUsers
      ])
    }
  }
}

export { router }
