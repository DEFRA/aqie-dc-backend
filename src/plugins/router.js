import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { s3Import } from '../routes/s3-import.js'
// no longer used
// Flow now starts from S3 bucket
// import {
//   initiateImportController,
//   checkUploadStatusController
// } from '../routes/admin-import.js'
import { createApplication } from '../routes/applications/create-application.js'
import { getAllApplications } from '../routes/applications/get-all-applications.js'
import { getApplicationById } from '../routes/applications/get-application-by-id.js'
import { getApplicationsWithSummary } from '../routes/applications/get-applications-with-summary.js'
import { getCounts } from '../routes/applications/get-counts.js'
import { searchApplications } from '../routes/applications/search-applications.js'
import { createAppliance } from '../routes/appliances/create-appliance.js'
import { getAllAppliances } from '../routes/appliances/get-all-appliances.js'
import { getApplianceById } from '../routes/appliances/get-appliance-by-id.js'
import { searchAppliances } from '../routes/appliances/search-appliances.js'
import { updateAppliance } from '../routes/appliances/update-appliance.js'
import { deleteAppliance } from '../routes/appliances/delete-appliance.js'
import { getFuelById } from '../routes/fuels/get-fuel-by-id.js'
import { searchFuels } from '../routes/fuels/search-fuels.js'
import { createFuel } from '../routes/fuels/create-fuel.js'
import { getAllFuels } from '../routes/fuels/get-all-fuels.js'
import { updateFuel } from '../routes/fuels/update-fuel.js'
import { deleteFuel } from '../routes/fuels/delete-fuel.js'
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

      // S3 import route
      server.route(s3Import)

      // Admin import routes - DISABLED (steps 11-14)
      //   method: 'POST',
      //   path: '/upload-and-scan/{uploadId}',
      //   options: {
      //     auth: false,
      //     payload: {
      //       output: 'stream',
      //       parse: false,
      //       maxBytes: config.get('cdpUploader.maxFileSize')
      //     }
      //   },
      //   handler: {
      //     proxy: {
      //       mapUri: (request) => {
      //         const { uploadId } = request.params
      //         const cdpUploaderUrl = config.get('cdpUploader.url')
      //         return {
      //           uri: `${cdpUploaderUrl}/upload-and-scan/${uploadId}`
      //         }
      //       },
      //       passThrough: true,
      //       xforward: true
      //     }
      //   }
      // })

      // Application API routes
      server.route([
        createApplication,
        getAllApplications,
        getCounts,
        getApplicationsWithSummary,
        searchApplications, // Must come before getApplicationById to avoid route conflict
        getApplicationById
      ])

      // Appliance API routes
      server.route([
        createAppliance,
        getAllAppliances,
        searchAppliances, // Must come before getApplianceById to avoid route conflict
        getApplianceById,
        updateAppliance,
        deleteAppliance
      ])

      // Fuel API routes
      server.route([
        createFuel,
        getAllFuels,
        updateFuel,
        deleteFuel,
        searchFuels, // Must come before getFuelById to avoid route conflict
        getFuelById
      ])
    }
  }
}

export { router }
