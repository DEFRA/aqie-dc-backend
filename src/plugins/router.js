import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { uploadCallback } from '../routes/upload-callback.js'
import {
  initiateImportController,
  checkUploadStatusController
} from '../routes/admin-import.js'
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
import { updateApplianceTechnicalReviewChecklist } from '../routes/appliances/update-appliance-technical-review-checklist.js'
import { updateApplianceTechnicalReviewCheckByPath } from '../routes/appliances/update-appliance-technical-review-check-by-path.js'
import { updateApplianceTechnicalReviewCheckByAlias } from '../routes/appliances/update-appliance-technical-review-check-alias.js'
import { deleteAppliance } from '../routes/appliances/delete-appliance.js'
import { getFuelById } from '../routes/fuels/get-fuel-by-id.js'
import { searchFuels } from '../routes/fuels/search-fuels.js'
import { createFuel } from '../routes/fuels/create-fuel.js'
import { getAllFuels } from '../routes/fuels/get-all-fuels.js'
import { updateFuel } from '../routes/fuels/update-fuel.js'
import { deleteFuel } from '../routes/fuels/delete-fuel.js'
import { createSqsMessage } from '../routes/sqs-messages/create-sqs-message.js'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'
import { config } from '../config.js'

const getAdminImportRoutes = () => [
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
]

const getCdpUploaderProxyRoute = () => ({
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

const router = {
  plugin: {
    name: 'router',
    register: async (server, _options) => {
      // Register @hapi/inert for static file serving
      await server.register(Inert)

      // Register @hapi/h2o2 for proxying
      await server.register(H2o2)

      // Health check, example, routes
      const baseRoutes = [health].concat(example)
      server.route(baseRoutes)

      // CDP Uploader callback route
      server.route(uploadCallback)

      // Admin import routes
      server.route(getAdminImportRoutes())

      // Proxy route for CDP Uploader upload endpoint
      // Note: This route does NOT include the service name prefix
      // The gateway strips /aqie-dc-backend before routing to this service
      server.route(getCdpUploaderProxyRoute())

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
        updateApplianceTechnicalReviewChecklist,
        updateApplianceTechnicalReviewCheckByPath,
        updateApplianceTechnicalReviewCheckByAlias,
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

      // SQS Message API routes
      server.route([createSqsMessage])
    }
  }
}

export { router }
