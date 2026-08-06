/**
 * Admin Import Routes
 * Provides UI and API endpoints for Excel file imports using CDP Uploader
 * Supports dynamic entity types
 */

import Boom from '@hapi/boom'
//import Joi from 'joi'
import {
  initiateCdpUpload,
  getCdpUploadStatus
} from '../common/helpers/cdp-uploader.js'
//import { ENTITY_TYPES } from '../common/helpers/entity-config.js'
//import { config } from '../config.js'
import { statusCodes } from '../common/constants/status-codes.js'

// /**
//  * Initiate CDP Upload
//  * Starts the CDP Uploader flow and returns uploadUrl and statusUrl
//  * Supports dynamic entity configuration
//  */
// const initiateImportController = {
//   options: {
//     validate: {
//       payload: Joi.object({
//         entities: Joi.array()
//           .items(
//             Joi.alternatives().try(
//               Joi.string().valid(...Object.values(ENTITY_TYPES)),
//               Joi.object({
//                 type: Joi.string()
//                   .valid(...Object.values(ENTITY_TYPES))
//                   .required(),
//                 sheetName: Joi.string().optional()
//               })
//             )
//           )
//           .min(1)
//           .required()
//       })
//     }
//   },
//   handler: async (request, h) => {
//     const { entities } = request.payload
//
//     const normalizedEntities = entities.map((entity) =>
//       typeof entity === 'string' ? { type: entity } : entity
//     )
//
//     try {
//       const result = await initiateCdpUpload({
//         metadata: {
//           entities: normalizedEntities
//         }
//       })
//
//       request.logger.info(
//         { uploadId: result.uploadId, entities: normalizedEntities },
//         'CDP upload initiated'
//       )
//
//       const cdpEnvironment = config.get('cdpEnvironment')
//       const serviceName = config.get('serviceName')
//       let uploadUrl = result.uploadUrl
//
//       if (cdpEnvironment !== 'local') {
//         uploadUrl = `/${serviceName}${result.uploadUrl}`
//       }
//
//       return h
//         .response({
//           success: true,
//           uploadId: result.uploadId,
//           uploadUrl,
//           statusUrl: result.statusUrl
//         })
//         .code(statusCodes.ok)
//     } catch (error) {
//       request.logger.error(error, 'Failed to initiate CDP upload')
//
//       if (Boom.isBoom(error)) {
//         throw error
//       }
//
//       const status = error?.status
//       if (status && status >= statusCodes.internalServerError) {
//         return Boom.badGateway('Upload service is currently unavailable')
//       }
//
//       return Boom.internal('Failed to initiate upload')
//     }
//   }
// }

/**
 * Temporary test controller
 */
const initiateImportController = {
  handler: async (request, h) => {
    try {
      const result = await initiateCdpUpload({})

      return h
        .response({
          success: true,
          uploadId: result.uploadId,
          uploadUrl: result.uploadUrl,
          statusUrl: result.statusUrl
        })
        .code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to initiate CDP upload')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to initiate upload')
    }
  }
}

// /**
//  * Check Upload Status
//  * Polls CDP Uploader for upload status
//  */
// const checkUploadStatusController = {
//   options: {
//     validate: {
//       query: Joi.object({
//         statusUrl: Joi.string().uri().required()
//       })
//     }
//   },
//   handler: async (request, h) => {
//     const { statusUrl } = request.query
//
//     try {
//       const status = await getCdpUploadStatus(statusUrl)
//
//       return h
//         .response({
//           success: true,
//           status
//         })
//         .code(statusCodes.ok)
//     } catch (error) {
//       request.logger.error(error, 'Failed to get upload status')
//
//       if (Boom.isBoom(error)) {
//         throw error
//       }
//
//       const status = error?.status
//       if (status && status >= statusCodes.internalServerError) {
//         return Boom.badGateway('Upload status service is currently unavailable')
//       }
//
//       return Boom.internal('Failed to get upload status')
//     }
//   }
// }

/**
 * Temporary test controller
 */
const checkUploadStatusController = {
  handler: async (request, h) => {
    try {
      const { statusUrl } = request.query

      const status = await getCdpUploadStatus(statusUrl)

      return h
        .response({
          success: true,
          status
        })
        .code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to get upload status')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to get upload status')
    }
  }
}

export { initiateImportController, checkUploadStatusController }
