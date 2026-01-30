# Testing Guide - CDP Uploader Implementation

## Overview

This guide covers testing the Excel import system with CDP Uploader integration.

## Prerequisites

### 1. CDP Uploader Service Running

You need the CDP Uploader service running locally. Two options:

#### Option A: Run CDP Uploader via Docker Compose

```bash
# Clone CDP Uploader repository
git clone https://github.com/DEFRA/cdp-uploader.git
cd cdp-uploader

# Copy compose files
cp compose.yml ../aqie-dc-backend/
cp -r compose ../aqie-dc-backend/

# Start CDP Uploader
docker compose up --build
```

CDP Uploader will be available at: `http://localhost:7337`

#### Option B: Use Existing LocalStack

If you already have LocalStack running:

```bash
cd aqie-dc-backend
docker compose up -d localstack
```

### 2. Verify Configuration

Check `src/config.js` has correct CDP Uploader URL:

```javascript
cdpUploader: {
  url: {
    default: 'http://localhost:7337',
    env: 'CDP_UPLOADER_URL'
  }
}
```

## Testing Steps

### 1. Start the Backend Service

```bash
npm run dev
```

The service should start on `http://localhost:3001`

### 2. Access Admin Import Page

Open browser: `http://localhost:3001/admin/import`

You should see:

- Upload form with drag-and-drop area
- Import type selector (Both/Appliances/Fuels)
- Sheet name inputs
- Download links for Excel templates

### 3. Download Template

Click one of the template links:

- **Appliances Template**: Basic appliances data
- **Fuels Template**: Basic fuels data
- **Combined Template**: Both appliances and fuels in one file

### 4. Test File Upload

#### Test Case 1: Valid File Upload

1. Select "Both" as import type
2. Upload `combined-import-template.xlsx`
3. Click "Upload and Import"
4. Expected flow:
   - ✅ "Initiating upload..." message
   - ✅ "Uploading file to CDP Uploader..." message
   - ✅ "File uploaded. Scanning for viruses..." message
   - ✅ Progress bar animates
   - ✅ After ~5-10 seconds: "Import completed successfully!"

#### Test Case 2: Virus Scan Rejection

To test virus detection, you can use the EICAR test file pattern:

```bash
# Create a test file with EICAR pattern (standard virus test string)
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > test-virus.xlsx
```

Upload this file - it should be rejected with virus detection message.

#### Test Case 3: File Too Large

Try uploading a file > 10MB - should be rejected by CDP Uploader.

### 5. Verify Database Import

After successful upload, check MongoDB:

```bash
# Connect to MongoDB
mongosh mongodb://127.0.0.1:27017

# Switch to database
use aqie-dc-backend

# Check appliances collection
db.appliances.countDocuments()
db.appliances.find().limit(5).pretty()

# Check fuels collection
db.fuels.countDocuments()
db.fuels.find().limit(5).pretty()
```

### 6. Check Logs

Monitor application logs for:

```bash
# In dev mode logs should show:
# - CDP upload initiated with uploadId
# - Callback received from CDP Uploader
# - File downloaded from S3
# - Import completed
# - Temp file cleanup
```

## API Endpoints Testing

### 1. Initiate Upload (API)

```bash
curl -X POST http://localhost:3001/admin/import/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "importType": "both",
    "appliancesSheet": "Appliances",
    "fuelsSheet": "Fuels"
  }'
```

Expected response:

```json
{
  "success": true,
  "uploadId": "abc-123-xyz",
  "uploadUrl": "http://localhost:7337/upload-and-scan/abc-123-xyz",
  "statusUrl": "http://localhost:7337/status/abc-123-xyz"
}
```

### 2. Check Upload Status (API)

```bash
curl "http://localhost:3001/admin/import/status?statusUrl=http://localhost:7337/status/abc-123-xyz"
```

Expected response (when ready):

```json
{
  "success": true,
  "status": {
    "uploadStatus": "ready",
    "numberOfRejectedFiles": 0,
    "form": {
      "file": {
        "filename": "combined-import-template.xlsx",
        "fileStatus": "complete",
        "s3Bucket": "aqie-dc-backend",
        "s3Key": "uploads/abc-123-xyz/file-xyz.xlsx"
      }
    }
  }
}
```

### 3. Upload Callback (Simulated)

This is normally called by CDP Uploader, but you can test manually:

```bash
curl -X POST http://localhost:3001/upload-callback \
  -H "Content-Type: application/json" \
  -d '{
    "uploadStatus": "ready",
    "numberOfRejectedFiles": 0,
    "metadata": {
      "importType": "both",
      "appliancesSheet": "Appliances",
      "fuelsSheet": "Fuels"
    },
    "form": {
      "file": {
        "filename": "test.xlsx",
        "fileStatus": "complete",
        "s3Bucket": "aqie-dc-backend",
        "s3Key": "uploads/test/file.xlsx"
      }
    }
  }'
```

## Troubleshooting

### Issue: CDP Uploader Not Responding

**Solution:**

```bash
# Check CDP Uploader is running
curl http://localhost:7337/health

# If not running, start it:
cd cdp-uploader
docker compose up -d
```

### Issue: S3 Download Fails

**Solution:**

```bash
# Check LocalStack is running
docker ps | grep localstack

# Check S3 bucket exists
aws --endpoint-url=http://localhost:4566 s3 ls

# Create bucket if missing
aws --endpoint-url=http://localhost:4566 s3 mb s3://aqie-dc-backend
```

### Issue: Callback Not Received

**Solution:**

- Check CDP Uploader logs: `docker compose logs cdp-uploader`
- Verify callback URL in config is correct
- For local dev, callback URL should be: `http://host.docker.internal:3001/upload-callback`

### Issue: Import Fails with "File not found"

**Solution:**

- CDP Uploader hasn't finished uploading to S3
- Wait for `uploadStatus: 'ready'` before processing
- Check S3 bucket for the file

### Issue: Template Downloads Fail (404)

**Solution:**

```bash
# Verify templates directory exists
ls -la templates/

# Check file names match routes
# Should be:
# - appliances-import-template.xlsx
# - fuels-import-template.xlsx
# - combined-import-template.xlsx
```

## Environment-Specific Testing

### Local Development

- CDP Uploader: `http://localhost:7337`
- S3: LocalStack `http://localhost:4566`
- Callback: `http://host.docker.internal:3001/upload-callback`

### CDP Dev Environment

- CDP Uploader: `https://cdp-uploader.dev.cdp-int.defra.cloud`
- S3: Real AWS S3 (eu-west-2)
- Callback: `https://aqie-dc-backend.dev.cdp-int.defra.cloud/upload-callback`

### CDP Test/Prod Environments

Same as Dev but with appropriate environment URLs.

## Security Notes

1. **Virus Scanning**: All files are scanned by ClamAV before processing
2. **S3 Storage**: Files are stored in quarantine bucket first, then moved after scan
3. **Callback Authentication**: CDP Uploader callbacks currently don't support auth (as per CDP docs)
4. **File Size Limit**: 10MB default (configurable in config.js)
5. **Allowed MIME Types**: Excel files only (.xlsx, .xls)

## Success Criteria

✅ Admin page loads correctly  
✅ Template downloads work  
✅ File upload initiates successfully  
✅ CDP Uploader receives file  
✅ Virus scan completes  
✅ Callback is received  
✅ File downloads from S3  
✅ Data imports to MongoDB  
✅ Temp files are cleaned up  
✅ Error handling works (virus, too large, etc.)

## Next Steps

After local testing passes:

1. Request S3 bucket creation via CDP Portal
2. Deploy to CDP Dev environment
3. Test with real CDP Uploader service
4. Validate callback URL in CDP environment
5. Test end-to-end flow in Dev
6. Promote to Test/Prod after validation
