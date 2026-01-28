/**
 * Import API endpoint
 * Allows uploading Excel files through the API for importing/updating data
 */

import Boom from '@hapi/boom'
import Joi from 'joi'
import { importFromExcel } from '../migrations/import-from-excel.js'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const importController = {
  options: {
    payload: {
      output: 'stream',
      parse: true,
      allow: 'multipart/form-data',
      multipart: true,
      maxBytes: 10485760 // 10MB
    },
    validate: {
      payload: Joi.object({
        file: Joi.any().required().description('Excel file to import'),
        type: Joi.string()
          .valid('appliances', 'fuels', 'both')
          .default('both')
          .description('Type of data to import'),
        appliancesSheet: Joi.string()
          .optional()
          .description('Name of appliances sheet in Excel'),
        fuelsSheet: Joi.string()
          .optional()
          .description('Name of fuels sheet in Excel')
      }),
      failAction: (request, h, err) => {
        request.logger.error(err)
        throw Boom.badRequest(err.message)
      }
    }
  },
  handler: async (request, h) => {
    const { file, type, appliancesSheet, fuelsSheet } = request.payload
    const db = request.db

    let tempFilePath

    try {
      // Validate file
      if (!file || !file.hapi || !file.hapi.filename) {
        throw Boom.badRequest('No file uploaded')
      }

      const filename = file.hapi.filename
      if (!filename.match(/\.(xlsx|xls)$/i)) {
        throw Boom.badRequest('File must be an Excel file (.xlsx or .xls)')
      }

      // Save uploaded file temporarily
      tempFilePath = join(tmpdir(), `import-${Date.now()}-${filename}`)
      const fileStream = file
      const chunks = []

      for await (const chunk of fileStream) {
        chunks.push(chunk)
      }

      await writeFile(tempFilePath, Buffer.concat(chunks))

      request.logger.info(
        {
          file: filename,
          type,
          tempPath: tempFilePath
        },
        'Processing import file'
      )

      // Import data
      const results = await importFromExcel(db, tempFilePath, type, {
        appliancesSheet,
        fuelsSheet,
        verbose: false
      })

      request.logger.info({ results }, 'Import completed')

      return h
        .response({
          success: true,
          message: 'Import completed successfully',
          results
        })
        .code(200)
    } catch (error) {
      request.logger.error(error, 'Import failed')

      if (Boom.isBoom(error)) {
        throw error
      }

      throw Boom.badImplementation('Import failed: ' + error.message)
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        try {
          await unlink(tempFilePath)
        } catch (err) {
          request.logger.warn(err, 'Failed to delete temporary file')
        }
      }
    }
  }
}

export default {
  plugin: {
    name: 'import',
    register: (server) => {
      server.route([
        {
          method: 'POST',
          path: '/import',
          ...importController
        }
      ])
    }
  }
}
