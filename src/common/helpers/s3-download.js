/**
 * S3 Download Helper
 * Provides functions to download files from S3 and manage temporary files
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { config } from '../../config.js'

/**
 * Download file from S3 to temporary location
 * @param {string} s3Bucket S3 bucket name
 * @param {string} s3Key S3 object key
 * @param {object} logger Logger instance
 * @returns {Promise<string>} Path to downloaded file
 */
export async function downloadFromS3(s3Bucket, s3Key, logger) {
  const region = config.get('aws.region')
  const cdpEnvironment = config.get('cdpEnvironment')

  // Configure S3 client based on environment
  const s3ClientConfig = {
    region
  }

  // For local development, use LocalStack endpoint
  if (cdpEnvironment === 'local') {
    s3ClientConfig.endpoint = 'http://localhost:4566'
    s3ClientConfig.forcePathStyle = true
  }

  const s3Client = new S3Client(s3ClientConfig)

  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: s3Key
  })

  logger.info({ s3Bucket, s3Key, region }, 'Downloading file from S3')

  const response = await s3Client.send(command)

  // Stream to temp file
  const tempFilePath = join(tmpdir(), `s3-download-${Date.now()}.xlsx`)
  const chunks = []

  for await (const chunk of response.Body) {
    chunks.push(chunk)
  }

  await writeFile(tempFilePath, Buffer.concat(chunks))

  logger.info({ tempFilePath, size: chunks.length }, 'File downloaded from S3')

  return tempFilePath
}

/**
 * Clean up temporary file
 * @param {string} filePath Path to file to delete
 * @param {object} logger Logger instance
 */
export async function cleanupTempFile(filePath, logger) {
  try {
    await unlink(filePath)
    logger.info({ filePath }, 'Temporary file cleaned up')
  } catch (error) {
    logger.warn(
      { filePath, error: error.message },
      'Failed to cleanup temp file'
    )
  }
}
