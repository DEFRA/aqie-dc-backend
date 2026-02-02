/**
 * Admin Import Routes
 * Provides UI and API endpoints for Excel file imports using CDP Uploader
 * Supports dynamic entity types
 */

import Joi from 'joi'
import {
  initiateCdpUpload,
  getCdpUploadStatus
} from '../common/helpers/cdp-uploader.js'
import { ENTITY_TYPES } from '../common/helpers/entity-config.js'

/**
 * Initiate CDP Upload
 * Starts the CDP Uploader flow and returns uploadUrl and statusUrl
 * Supports dynamic entity configuration
 */
const initiateImportController = {
  options: {
    validate: {
      payload: Joi.object({
        entities: Joi.array()
          .items(
            Joi.alternatives().try(
              Joi.string().valid(...Object.values(ENTITY_TYPES)),
              Joi.object({
                type: Joi.string()
                  .valid(...Object.values(ENTITY_TYPES))
                  .required(),
                sheetName: Joi.string().optional()
              })
            )
          )
          .min(1)
          .required()
      })
    }
  },
  handler: async (request, h) => {
    const { entities } = request.payload

    // Normalize entities to object format
    const normalizedEntities = entities.map((entity) =>
      typeof entity === 'string' ? { type: entity } : entity
    )

    try {
      // Initiate upload with CDP Uploader
      const result = await initiateCdpUpload({
        metadata: {
          entities: normalizedEntities
        }
      })

      request.logger.info(
        { uploadId: result.uploadId, entities: normalizedEntities },
        'CDP upload initiated'
      )

      return h
        .response({
          success: true,
          uploadId: result.uploadId,
          uploadUrl: result.uploadUrl,
          statusUrl: result.statusUrl
        })
        .code(200)
    } catch (error) {
      request.logger.error(error, 'Failed to initiate CDP upload')
      return h
        .response({
          success: false,
          message: 'Failed to initiate upload',
          error: error.message
        })
        .code(500)
    }
  }
}

/**
 * Check Upload Status
 * Polls CDP Uploader for upload status
 */
const checkUploadStatusController = {
  options: {
    validate: {
      query: Joi.object({
        statusUrl: Joi.string().uri().required()
      })
    }
  },
  handler: async (request, h) => {
    const { statusUrl } = request.query

    try {
      const status = await getCdpUploadStatus(statusUrl)

      return h
        .response({
          success: true,
          status
        })
        .code(200)
    } catch (error) {
      request.logger.error(error, 'Failed to get upload status')
      return h
        .response({
          success: false,
          message: 'Failed to get upload status',
          error: error.message
        })
        .code(500)
    }
  }
}

export { initiateImportController, checkUploadStatusController }
