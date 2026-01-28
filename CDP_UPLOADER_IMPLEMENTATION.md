# CDP Uploader Integration Implementation Plan

## Overview

This document outlines the steps to refactor the current direct file upload implementation to use CDP Uploader service, following CDP best practices for file uploads with virus scanning and S3 storage.

## Current vs CDP Pattern

### Current Implementation (Non-Compliant)

```
User → Admin Page → Direct Upload to Backend → Process Excel → Database
```

**Issues:**

- No virus scanning
- Files processed directly without quarantine
- No S3 storage integration
- Bypasses CDP security standards

### CDP Required Pattern (Compliant)

```
User → Admin Page → /initiate → CDP Uploader → Quarantine → Virus Scan → S3 → Callback → Process Excel → Database
```

**Benefits:**

- Automatic virus scanning
- Files quarantined before processing
- S3-based storage
- Follows DEFRA security standards

## Implementation Steps

### Step 1: Add Configuration

**File:** `src/config.js`

Add CDP Uploader configuration:

```javascript
cdpUploader: {
  url: {
    doc: 'CDP Uploader service URL',
    format: String,
    default: 'http://localhost:7337',
    env: 'CDP_UPLOADER_URL'
  },
  s3Bucket: {
    doc: 'S3 bucket for uploaded files',
    format: String,
    default: 'aqie-dc-uploads',
    env: 'CDP_UPLOADER_S3_BUCKET'
  },
  s3Prefix: {
    doc: 'S3 prefix (folder) for uploaded files',
    format: String,
    default: 'imports',
    env: 'CDP_UPLOADER_S3_PREFIX'
  },
  maxFileSize: {
    doc: 'Maximum file size in bytes',
    format: Number,
    default: 10485760, // 10MB
    env: 'CDP_UPLOADER_MAX_FILE_SIZE'
  },
  allowedMimeTypes: {
    doc: 'Allowed MIME types for uploads',
    format: Array,
    default: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ],
    env: 'CDP_UPLOADER_ALLOWED_MIME_TYPES'
  }
},
aws: {
  region: {
    doc: 'AWS region',
    format: String,
    default: 'eu-west-2',
    env: 'AWS_REGION'
  }
}
```

### Step 2: Install AWS SDK

```bash
npm install @aws-sdk/client-s3
```

### Step 3: Create CDP Uploader Service Helper

**File:** `src/common/helpers/cdp-uploader.js`

```javascript
import { config } from '../../config.js'

/**
 * Initialize upload with CDP Uploader
 * @param {object} options Upload options
 * @returns {Promise<{uploadId: string, uploadUrl: string, statusUrl: string}>}
 */
export async function initiateCdpUpload(options = {}) {
  const { metadata = {}, s3Path = config.get('cdpUploader.s3Prefix') } = options

  const cdpUploaderUrl = config.get('cdpUploader.url')
  const s3Bucket = config.get('cdpUploader.s3Bucket')
  const maxFileSize = config.get('cdpUploader.maxFileSize')
  const mimeTypes = config.get('cdpUploader.allowedMimeTypes')

  // Get the backend base URL for callback
  const backendUrl = `${config.get('host')}:${config.get('port')}`
  const callbackUrl = `${backendUrl}/upload-callback`

  const response = await fetch(`${cdpUploaderUrl}/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      redirect: '/admin/import',
      callback: callbackUrl,
      s3Bucket,
      s3Path,
      metadata,
      mimeTypes,
      maxFileSize
    })
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
```

### Step 4: Create S3 Download Helper

**File:** `src/common/helpers/s3-download.js`

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { config } from '../../config.js'

/**
 * Download file from S3 to temporary location
 * @param {string} s3Bucket S3 bucket name
 * @param {string} s3Key S3 object key
 * @returns {Promise<string>} Path to downloaded file
 */
export async function downloadFromS3(s3Bucket, s3Key) {
  const s3Client = new S3Client({
    region: config.get('aws.region')
  })

  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: s3Key
  })

  const response = await s3Client.send(command)

  // Stream to temp file
  const tempFilePath = join(tmpdir(), `s3-download-${Date.now()}.xlsx`)
  const chunks = []

  for await (const chunk of response.Body) {
    chunks.push(chunk)
  }

  await writeFile(tempFilePath, Buffer.concat(chunks))

  return tempFilePath
}

/**
 * Clean up temporary file
 * @param {string} filePath Path to file to delete
 */
export async function cleanupTempFile(filePath) {
  try {
    await unlink(filePath)
  } catch (error) {
    // Ignore errors if file doesn't exist
  }
}
```

### Step 5: Create Upload Callback Handler

**File:** `src/routes/upload-callback.js`

```javascript
import Joi from 'joi'
import Boom from '@hapi/boom'
import { importFromExcel } from '../migrations/import-from-excel.js'
import {
  downloadFromS3,
  cleanupTempFile
} from '../common/helpers/s3-download.js'

/**
 * Upload callback handler
 * Called by CDP Uploader after virus scan completes
 */
const uploadCallbackController = {
  options: {
    auth: false, // CDP Uploader doesn't support auth on callbacks yet
    validate: {
      payload: Joi.object({
        uploadStatus: Joi.string().required(),
        uploadId: Joi.string().optional(),
        metadata: Joi.object().required(),
        form: Joi.object().required(),
        numberOfRejectedFiles: Joi.number().integer().required()
      })
    }
  },
  handler: async (request, h) => {
    const { uploadStatus, metadata, form, numberOfRejectedFiles } =
      request.payload
    const db = request.db

    request.logger.info({ uploadStatus, metadata }, 'Upload callback received')

    // Check if upload is ready
    if (uploadStatus !== 'ready') {
      request.logger.warn({ uploadStatus }, 'Upload not ready')
      return h
        .response({ success: false, message: 'Upload not ready' })
        .code(200)
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
            'One or more files were rejected (virus or validation failed)'
        })
        .code(200)
    }

    // Get file details from form
    const fileField = form.file
    if (!fileField || fileField.fileStatus !== 'complete') {
      request.logger.error({ fileField }, 'File not complete or missing')
      return h
        .response({ success: false, message: 'File not available' })
        .code(200)
    }

    const { s3Bucket, s3Key, filename } = fileField
    const { importType, appliancesSheet, fuelsSheet } = metadata

    let tempFilePath

    try {
      // Download file from S3
      request.logger.info({ s3Bucket, s3Key }, 'Downloading file from S3')
      tempFilePath = await downloadFromS3(s3Bucket, s3Key)

      // Import data
      request.logger.info({ importType, filename }, 'Processing import')
      const results = await importFromExcel(db, tempFilePath, importType, {
        appliancesSheet,
        fuelsSheet,
        verbose: false
      })

      request.logger.info({ results }, 'Import completed successfully')

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
          message: error.message
        })
        .code(500)
    } finally {
      // Cleanup temp file
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath)
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
```

### Step 6: Update Admin Import Page

**File:** `src/routes/admin-import.js`

Update the admin page to use CDP Uploader initiate flow:

```javascript
import { initiateCdpUpload } from '../common/helpers/cdp-uploader.js'

// Add new endpoint to initiate upload
const initiateImport = {
  method: 'POST',
  path: '/admin/import/initiate',
  options: {
    auth: false, // TODO: Add authentication
    validate: {
      payload: Joi.object({
        importType: Joi.string()
          .valid('appliances', 'fuels', 'both')
          .default('both'),
        appliancesSheet: Joi.string().optional(),
        fuelsSheet: Joi.string().optional()
      })
    }
  },
  handler: async (request, h) => {
    const { importType, appliancesSheet, fuelsSheet } = request.payload

    try {
      // Initiate upload with CDP Uploader
      const uploadDetails = await initiateCdpUpload({
        metadata: {
          importType,
          appliancesSheet,
          fuelsSheet
        }
      })

      return h
        .response({
          success: true,
          uploadUrl: uploadDetails.uploadUrl,
          uploadId: uploadDetails.uploadId,
          statusUrl: uploadDetails.statusUrl
        })
        .code(200)
    } catch (error) {
      request.logger.error(error, 'Failed to initiate upload')
      throw Boom.badImplementation('Failed to initiate upload')
    }
  }
}

// Update the admin page JavaScript to use the new flow
const adminImportPage = {
  method: 'GET',
  path: '/admin/import',
  options: {
    auth: false // TODO: Add authentication
  },
  handler: (request, h) => {
    return h
      .response(
        `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <!-- ... existing head content ... -->
      </head>
      <body>
        <!-- ... existing content ... -->
        
        <script>
          async function initiateUpload() {
            const importType = document.getElementById('importType').value;
            const appliancesSheet = document.getElementById('appliancesSheet').value;
            const fuelsSheet = document.getElementById('fuelsSheet').value;
            
            try {
              // Step 1: Initiate upload
              const initResponse = await fetch('/admin/import/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  importType,
                  appliancesSheet,
                  fuelsSheet
                })
              });
              
              const initData = await initResponse.json();
              
              if (!initData.success) {
                throw new Error('Failed to initiate upload');
              }
              
              return initData;
            } catch (error) {
              console.error('Initiate error:', error);
              throw error;
            }
          }
          
          async function uploadFile(file, uploadUrl) {
            const formData = new FormData();
            formData.append('file', file);
            
            // Step 2: Upload to CDP Uploader
            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              body: formData,
              redirect: 'manual'
            });
            
            // CDP Uploader returns 302, which is expected
            if (uploadResponse.type === 'opaqueredirect' || uploadResponse.status === 302) {
              console.log('Upload accepted, scanning in progress');
              return true;
            }
            
            throw new Error('Upload failed');
          }
          
          async function pollStatus(statusUrl) {
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds max
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const statusResponse = await fetch(statusUrl);
              const status = await statusResponse.json();
              
              if (status.uploadStatus === 'ready') {
                return status;
              }
              
              attempts++;
            }
            
            throw new Error('Upload timed out');
          }
          
          // Update dropzone handler
          async function handleFileUpload(file) {
            try {
              updateProgress('Initiating upload...', 10);
              
              const initData = await initiateUpload();
              
              updateProgress('Uploading file...', 30);
              
              await uploadFile(file, initData.uploadUrl);
              
              updateProgress('Scanning for viruses...', 50);
              
              const status = await pollStatus(initData.statusUrl);
              
              if (status.numberOfRejectedFiles > 0) {
                throw new Error('File was rejected (virus detected or validation failed)');
              }
              
              updateProgress('Processing import (this may take a few minutes)...', 80);
              
              // Import will happen via callback automatically
              // Poll status for final results
              const finalStatus = await pollFinalStatus(initData.uploadId);
              
              updateProgress('Complete!', 100);
              showResults(finalStatus);
            } catch (error) {
              showError(error.message);
            }
          }
        </script>
      </body>
      </html>
    `
      )
      .type('text/html')
  }
}

export default [adminImportPage, initiateImport]
```

### Step 7: Update Router

**File:** `src/plugins/router.js`

```javascript
import { uploadCallback } from '../routes/upload-callback.js'

const routes = [].concat(
  healthRoute,
  exampleRoute,
  importRoute,
  adminImport,
  [uploadCallback] // Add callback route
)
```

### Step 8: Environment Variables

Add to your environment configuration:

```bash
# Local Development (.env)
CDP_UPLOADER_URL=http://localhost:7337
CDP_UPLOADER_S3_BUCKET=aqie-dc-uploads-local
CDP_UPLOADER_S3_PREFIX=imports
CDP_UPLOADER_MAX_FILE_SIZE=10485760
AWS_REGION=eu-west-2

# CDP Environments (configured via CDP Portal)
# Dev
CDP_UPLOADER_URL=https://cdp-uploader.dev.cdp-int.defra.cloud
CDP_UPLOADER_S3_BUCKET=aqie-dc-uploads-dev

# Test
CDP_UPLOADER_URL=https://cdp-uploader.test.cdp-int.defra.cloud
CDP_UPLOADER_S3_BUCKET=aqie-dc-uploads-test

# Prod
CDP_UPLOADER_URL=https://cdp-uploader.prod.cdp-int.defra.cloud
CDP_UPLOADER_S3_BUCKET=aqie-dc-uploads-prod
```

### Step 9: S3 Bucket Setup

Request S3 bucket creation via CDP Portal:

1. Navigate to CDP Portal → Buckets
2. Request new bucket: `aqie-dc-uploads-{env}`
3. Set permissions for CDP Uploader service to write
4. Set permissions for your backend service to read

### Step 10: Testing

**Local Testing with CDP Uploader:**

1. Clone and run CDP Uploader locally:

```bash
git clone https://github.com/DEFRA/cdp-uploader.git
cd cdp-uploader
npm install
docker compose up -d  # Starts LocalStack (S3, SQS)
npm run dev
```

2. Test the flow:

- Visit `http://localhost:3001/admin/import`
- Upload Excel file
- Verify virus scanning works
- Check callback is triggered
- Verify data imported to MongoDB

## Migration Path

### Phase 1: Implement alongside existing (Recommended)

1. Keep current `/admin/import` page working
2. Create new `/admin/import-cdp` page with CDP Uploader
3. Test thoroughly in dev environment
4. Switch over when confident

### Phase 2: Replace existing

1. Update `/admin/import` to use CDP Uploader
2. Remove old direct upload code
3. Deploy to all environments

## Security Considerations

1. **Callback Authentication**: CDP Uploader doesn't currently support authentication on callbacks. The callback endpoint should:
   - Validate the payload structure
   - Log all callback attempts
   - Consider IP whitelisting in production

2. **S3 Access**: Ensure proper IAM roles:
   - CDP Uploader: Write-only to quarantine bucket
   - Your backend: Read-only from your designated bucket
   - No public access

3. **Admin Page**: Add authentication before production:
   ```javascript
   options: {
     auth: 'session' // or your auth strategy
   }
   ```

## Benefits of CDP Uploader

✅ **Virus Scanning**: All files scanned before your backend processes them  
✅ **S3 Storage**: Files stored in S3, not on container filesystem  
✅ **Audit Trail**: Complete upload history and scan results  
✅ **Standardized**: Follows DEFRA CDP best practices  
✅ **Scalable**: Handles large files and concurrent uploads  
✅ **Monitored**: Integrates with CDP monitoring and logging

## Comparison

| Feature        | Current (Direct Upload) | CDP Uploader          |
| -------------- | ----------------------- | --------------------- |
| Virus Scanning | ❌ None                 | ✅ Automatic          |
| Storage        | Container filesystem    | S3 buckets            |
| Security       | Basic validation        | Quarantine + scanning |
| Audit          | Basic logging           | Full audit trail      |
| Scalability    | Limited                 | High                  |
| CDP Compliant  | ❌ No                   | ✅ Yes                |

## Next Steps

1. Review this implementation plan
2. Decide on migration path (Phase 1 or 2)
3. Request S3 bucket creation via CDP Portal
4. Implement Step 1-7
5. Test locally with CDP Uploader
6. Deploy to dev environment
7. Test in dev
8. Deploy to test/prod

## Questions?

Contact CDP Platform team via [#cdp-support](https://defra-digital-team.slack.com/archives/C05UJ3SE5C6)
