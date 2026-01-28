/**
 * CDP Uploader Service Helper
 * Provides functions to interact with the CDP Uploader service
 */

import { config } from '../../config.js'

/**
 * Initialize upload with CDP Uploader
 * @param {object} options Upload options
 * @param {object} options.metadata Custom metadata to attach to upload
 * @param {string} [options.s3Path] S3 path prefix (defaults to config)
 * @param {string} [options.redirect] Redirect URL after upload (defaults to /admin/import)
 * @returns {Promise<{uploadId: string, uploadUrl: string, statusUrl: string}>}
 */
export async function initiateCdpUpload(options = {}) {
  const {
    metadata = {},
    s3Path = config.get('cdpUploader.s3Prefix'),
    redirect = '/admin/import'
  } = options

  const cdpUploaderUrl = config.get('cdpUploader.url')
  const s3Bucket = config.get('cdpUploader.s3Bucket')
  const maxFileSize = config.get('cdpUploader.maxFileSize')
  const mimeTypes = config.get('cdpUploader.allowedMimeTypes')
  const serviceName = config.get('serviceName')
  const cdpEnvironment = config.get('cdpEnvironment')

  // Build callback URL based on environment
  let callbackUrl
  if (cdpEnvironment === 'local') {
    // For local development, use explicit host:port
    const host = config.get('host')
    const port = config.get('port')
    callbackUrl = `http://${host}:${port}/upload-callback`
  } else {
    // For CDP environments, use service name and internal domain
    callbackUrl = `https://${serviceName}.${cdpEnvironment}.cdp-int.defra.cloud/upload-callback`
  }

  const payload = {
    redirect,
    callback: callbackUrl,
    s3Bucket,
    s3Path,
    metadata,
    mimeTypes,
    maxFileSize
  }

  const response = await fetch(`${cdpUploaderUrl}/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`CDP Uploader initiate failed: ${error}`)
  }

  return response.json()
}

/**
 * Poll CDP Uploader status endpoint
 * @param {string} statusUrl Status endpoint URL
 * @returns {Promise<object>}
 */
export async function getCdpUploadStatus(statusUrl) {
  const response = await fetch(statusUrl)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get upload status: ${error}`)
  }

  return response.json()
}
