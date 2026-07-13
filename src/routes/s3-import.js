/**
 * S3 Import Handler
 * Downloads Excel files from S3 and imports data into MongoDB
 * Supports dynamic entity imports
 */

import Joi from 'joi'
import { importFromExcel } from '../migrations/import-from-excel-dynamic.js'
import {
  downloadFromS3,
  cleanupTempFile
} from '../common/helpers/s3-download.js'

/**
 * Perform S3 import - reusable function for both API endpoint and startup initialization
 * @param {Db} db - MongoDB database instance
 * @param {string} s3Bucket - S3 bucket name
 * @param {string} s3Key - S3 object key
 * @param {Array} entities - Entity types to import ['appliances', 'fuels']
 * @param {object} logger - Logger instance
 * @returns {Promise<object>} Import results
 */
export async function performS3DataImport(db, s3Bucket, s3Key, entities, logger) {
  let tempFilePath

  try {
    logger.info({ s3Bucket, s3Key }, 'Downloading file from S3')
    tempFilePath = await downloadFromS3(s3Bucket, s3Key, logger)

    logger.info({ entities, tempFilePath }, 'Processing Excel import')

    const results = await importFromExcel(db, tempFilePath, entities, {
      verbose: false
    })

    logger.info({ results }, 'Import completed successfully')
    return results
  } catch (error) {
    logger.error(error, 'Import failed')
    throw error
  } finally {
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath, logger)
    }
  }
}

/**
 * S3 import controller
 * Downloads file from S3 and imports data
 */
const s3ImportController = {
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
          .code(400)
          .takeover()
      }
    }
  },
  handler: async (request, h) => {
    const db = request.db

    // ===== START: Commented out - CDP Uploader validation logic =====
    // const { uploadStatus, metadata, form, numberOfRejectedFiles } =
    //   request.payload
    //
    // request.logger.info(
    //   { uploadStatus, metadata, numberOfRejectedFiles },
    //   'Upload callback received from CDP Uploader'
    // )
    //
    // // Check if upload is ready
    // if (uploadStatus !== 'ready') {
    //   request.logger.warn({ uploadStatus }, 'Upload not ready yet')
    //   return h
    //     .response({ success: false, message: 'Upload not ready' })
    //     .code(200)
    // }
    //
    // // Check for rejected files
    // if (numberOfRejectedFiles > 0) {
    //   request.logger.error(
    //     { numberOfRejectedFiles },
    //     'Files rejected during scan'
    //   )
    //   return h
    //     .response({
    //       success: false,
    //       message:
    //         'One or more files were rejected (virus detected or validation failed)'
    //     })
    //     .code(200)
    // }
    //
    // // Get file details from form
    // const fileField = form.file
    // if (!fileField || fileField.fileStatus !== 'complete') {
    //   request.logger.error({ fileField }, 'File not complete or missing')
    //   return h
    //     .response({
    //       success: false,
    //       message: 'File not available or incomplete'
    //     })
    //     .code(200)
    // }
    //
    // // Check if file was rejected
    // if (fileField.hasError) {
    //   request.logger.error(
    //     { errorMessage: fileField.errorMessage },
    //     'File rejected with error'
    //   )
    //   return h
    //     .response({
    //       success: false,
    //       message: fileField.errorMessage || 'File validation failed'
    //     })
    //     .code(200)
    // }
    //
    // const { s3Bucket, s3Key, filename } = fileField
    // const { entities } = metadata
    //
    // if (!entities || !Array.isArray(entities) || entities.length === 0) {
    //   request.logger.error('No entities specified in metadata')
    //   return h
    //     .response({
    //       success: false,
    //       message: 'No entities specified for import'
    //     })
    //     .code(200)
    // }
    // ===== END: Commented out validation logic =====

    // ===== START: Hardcoded S3 values for testing flow =====
    const s3Bucket = 'tobeconfirmed'
    const s3Key = 'tobeconfirmed'
    const entities = ['appliances', 'fuels']
    // ===== END: Hardcoded values =====

    try {
      const results = await performS3DataImport(db, s3Bucket, s3Key, entities, request.logger)

      return h
        .response({
          success: true,
          message: 'Import completed successfully',
          results
        })
        .code(200)
    } catch (error) {
      request.logger.error(error, 'Import failed')
      return h
        .response({
          success: false,
          message: error.message || 'Import processing failed'
        })
        .code(500)
    }
  }
}

const s3Import = {
  method: 'POST',
  path: '/import',
  ...s3ImportController
}

export { s3Import }
