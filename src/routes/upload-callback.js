/**
 * Upload Callback Handler
 * Receives callbacks from CDP Uploader after virus scanning completes
 * Supports dynamic entity imports
 */

import Boom from '@hapi/boom'
import Joi from 'joi'
import { importFromExcel } from '../migrations/import-from-excel-dynamic.js'
import {
  downloadFromS3,
  cleanupTempFile
} from '../common/helpers/s3-download.js'
import { statusCodes } from '../common/constants/status-codes.js'

/**
 * Upload callback controller
 * Called by CDP Uploader after virus scan completes
 */
const uploadCallbackController = {
  options: {
    auth: false, // CDP Uploader callbacks don't support auth yet
    validate: {
      payload: Joi.object({
        uploadStatus: Joi.string().required(),
        uploadId: Joi.string().optional(),
        metadata: Joi.object().required(),
        form: Joi.object().required(),
        numberOfRejectedFiles: Joi.number().integer().required()
      }),
      failAction: (request, h, err) => {
        request.logger.error(err, 'Upload callback validation failed')
        return h
          .response({ success: false, message: err.message })
          .code(statusCodes.badRequest)
          .takeover()
      }
    }
  },
  handler: async (request, h) => {
    const { uploadStatus, metadata, form, numberOfRejectedFiles } =
      request.payload
    const db = request.db

    request.logger.info(
      { uploadStatus, metadata, numberOfRejectedFiles },
      'Upload callback received from CDP Uploader'
    )

    // Check if upload is ready
    if (uploadStatus !== 'ready') {
      request.logger.warn({ uploadStatus }, 'Upload not ready yet')
      return h
        .response({ success: false, message: 'Upload not ready' })
        .code(statusCodes.ok)
    }

    // Check for rejected files
    if (numberOfRejectedFiles > 0) {
      request.logger.error(
        { numberOfRejectedFiles },
        'Files rejected during scan'
      )
      return h
        .response({
          success: false,
          message:
            'One or more files were rejected (virus detected or validation failed)'
        })
        .code(statusCodes.ok)
    }

    // Get file details from form
    const fileField = form.file
    if (!fileField || fileField.fileStatus !== 'complete') {
      request.logger.error({ fileField }, 'File not complete or missing')
      return h
        .response({
          success: false,
          message: 'File not available or incomplete'
        })
        .code(statusCodes.ok)
    }

    // Check if file was rejected
    if (fileField.hasError) {
      request.logger.error(
        { errorMessage: fileField.errorMessage },
        'File rejected with error'
      )
      return h
        .response({
          success: false,
          message: fileField.errorMessage || 'File validation failed'
        })
        .code(statusCodes.ok)
    }

    const { s3Bucket, s3Key, filename } = fileField
    const { entities } = metadata

    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      request.logger.error('No entities specified in metadata')
      return h
        .response({
          success: false,
          message: 'No entities specified for import'
        })
        .code(statusCodes.ok)
    }

    let tempFilePath

    try {
      // Download file from S3
      request.logger.info(
        { s3Bucket, s3Key, filename },
        'Downloading file from S3'
      )
      tempFilePath = await downloadFromS3(s3Bucket, s3Key, request.logger)

      // Import data for each entity
      request.logger.info(
        { entities, filename, tempFilePath },
        'Processing Excel import'
      )

      const results = await importFromExcel(db, tempFilePath, entities, {
        verbose: false
      })

      request.logger.info({ results }, 'Import completed successfully')

      return h
        .response({
          success: true,
          message: 'Import completed successfully',
          results
        })
        .code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Import failed')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway('Import service is currently unavailable')
      }

      return Boom.internal('Import processing failed')
    } finally {
      // Cleanup temp file
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath, request.logger)
      }
    }
  }
}

const uploadCallback = {
  method: 'POST',
  path: '/upload-callback',
  ...uploadCallbackController
}

export { uploadCallback }
