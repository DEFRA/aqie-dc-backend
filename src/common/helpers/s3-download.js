/**
 * S3 Download Helper
 * Provides functions to download files from S3 and manage temporary files
 */
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand
} from '@aws-sdk/client-s3'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { config } from '../../config.js'

// Initialize the S3 Client.
// it will automatically inherit permissions from the IAM Task Role.
const region = config.get('aws.region') //in PRTR its s3.region
const cdpEnvironment = config.get('cdpEnvironment')
const s3Bucket = config.get('cdpUploader.s3Bucket')

// Configure S3 client based on environment
const s3ClientConfig = {
  region
}

// For local development, use LocalStack endpoint
if (cdpEnvironment === 'local') {
  s3ClientConfig.endpoint = 'http://localhost:4566'
  s3ClientConfig.forcePathStyle = true
}

export const s3Client = new S3Client(s3ClientConfig)

/**
 * Find the S3 key from metadata by matching the object's `encodedfilename` metadata.
 *
 * @param {string} bucketName S3 bucket name to search
 * @returns {Promise<string>} S3 object key that matches the metadata value `MasterList.xlsx`
 * @throws {Error} If no object with the matching metadata is found
 */
export const findKeyByMetadataFilename = async (bucketName) => {
  const encodedFilename = `MasterList.xlsx`

  let continuationToken

  do {
    const { Contents, NextContinuationToken } = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken
      })
    )

    for (const { Key } of Contents || []) {
      const { Metadata } = await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key
        })
      )

      if (Metadata?.encodedfilename === encodedFilename) {
        return Key
      }
    }

    continuationToken = NextContinuationToken
  } while (continuationToken)

  throw new Error(`File not found: ${encodedFilename}`)
}

/**
 * Download file from S3 to temporary location
 * @param {object} logger Logger instance
 * @returns {Promise<string>} Path to downloaded file
 */
export async function downloadFromS3(logger) {
  const s3Key = await findKeyByMetadataFilename(s3Bucket)

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
