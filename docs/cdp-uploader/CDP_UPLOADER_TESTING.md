# CDP Uploader Testing Guide

This guide provides curl commands for testing the CDP Uploader integration in the aqie-dc-backend service.

## Prerequisites

- Access to CDP dev environment
- Valid `x-api-key` for the dev environment
- Excel template file (located in `templates/` directory)

## Testing File Upload Flow

### Step 1: Initiate Upload

Call the `/admin/import/initiate` endpoint to start the upload session and get an uploadUrl:

```bash
curl -X POST \
  'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-dc-backend/admin/import/initiate' \
  -H 'x-api-key: f2sT08iWJSung5F8WvuQgGIuzYyPjRWl' \
  -H 'Content-Type: application/json' \
  -d '{
  "entities": [
    { "type": "appliances", "sheetName": "Appliances" },
    { "type": "fuels", "sheetName": "Fuels" },
    { "type": "users", "sheetName": "Users" },
    { "type": "userAppliances", "sheetName": "UserAppliances" },
    { "type": "userFuels", "sheetName": "UserFuels" }
  ]
}'
```

**Expected Response:**

```json
{
  "success": true,
  "uploadId": "abc-123-xyz",
  "uploadUrl": "/aqie-dc-backend/upload-and-scan/abc-123-xyz",
  "statusUrl": "https://cdp-uploader.dev.cdp-int.defra.cloud/status/abc-123-xyz"
}
```

### Step 2: Upload the File

Use the uploadId from Step 1 to upload your Excel file. **Important:** You must specify the correct MIME type.

```bash
curl -X POST \
  'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-dc-backend/upload-and-scan/{UPLOAD_ID}' \
  -H 'x-api-key: f2sT08iWJSung5F8WvuQgGIuzYyPjRWl' \
  -F 'file=@templates/combined-template.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
```

Replace `{UPLOAD_ID}` with the actual uploadId from Step 1.

**Expected Response:**

- HTTP 302 redirect to `/admin/import`
- This indicates the file was successfully received

### Step 3: Check Upload Status

Check the status of your upload using the statusUrl from Step 1:

```bash
curl 'https://cdp-uploader.dev.cdp-int.defra.cloud/status/{UPLOAD_ID}'
```

Replace `{UPLOAD_ID}` with the actual uploadId from Step 1.

**Expected Response (Success):**

```json
{
  "uploadStatus": "ready",
  "metadata": {
    "entities": [...]
  },
  "form": {
    "file": {
      "fileStatus": "complete",
      "filename": "combined-template.xlsx",
      "s3Bucket": "dev-aqie-dc-uploads-c63f2",
      "s3Key": "imports/...",
      ...
    }
  },
  "numberOfRejectedFiles": 0
}
```

## Complete Example

```bash
# Step 1: Initiate upload
RESPONSE=$(curl -s -X POST \
  'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-dc-backend/admin/import/initiate' \
  -H 'x-api-key: f2sT08iWJSung5F8WvuQgGIuzYyPjRWl' \
  -H 'Content-Type: application/json' \
  -d '{
  "entities": [
    { "type": "appliances", "sheetName": "Appliances" },
    { "type": "fuels", "sheetName": "Fuels" },
    { "type": "users", "sheetName": "Users" },
    { "type": "userAppliances", "sheetName": "UserAppliances" },
    { "type": "userFuels", "sheetName": "UserFuels" }
  ]
}')

# Extract uploadId
UPLOAD_ID=$(echo $RESPONSE | jq -r '.uploadId')
echo "Upload ID: $UPLOAD_ID"

# Step 2: Upload file
curl -X POST \
  "https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-dc-backend/upload-and-scan/$UPLOAD_ID" \
  -H 'x-api-key: f2sT08iWJSung5F8WvuQgGIuzYyPjRWl' \
  -F 'file=@templates/combined-template.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

# Step 3: Wait a few seconds for processing
sleep 3

# Check status
curl "https://cdp-uploader.dev.cdp-int.defra.cloud/status/$UPLOAD_ID" | jq
```

## Verifying Data Import

After successful upload, verify the data was imported to MongoDB using CDP Terminal:

1. Go to [CDP Portal](https://portal.cdp-int.defra.cloud/)
2. Navigate to `aqie-dc-backend` service
3. Click the "Terminal" tab
4. Launch terminal in **dev** environment
5. Connect to MongoDB:

```bash
mongosh
```

6. Check the imported data:

```javascript
// List all collections
show collections

// Count documents in each collection
db.users.countDocuments()
db.appliances.countDocuments()
db.fuels.countDocuments()
db.userAppliances.countDocuments()
db.userFuels.countDocuments()

// View sample data
db.users.find().limit(5)
db.appliances.find().limit(5)
```

## Available Templates

The following Excel templates are available in the `templates/` directory:

- `combined-template.xlsx` - All entities in one file (recommended for testing)
- `users-template.xlsx` - Users only
- `appliances-template.xlsx` - Appliances only
- `fuels-template.xlsx` - Fuels only
- `user-appliances-template.xlsx` - User-Appliance relationships
- `user-fuels-template.xlsx` - User-Fuel relationships
- `relationships-template.xlsx` - All relationships

## Troubleshooting

### File Rejected Error

If you get an error like `"The selected file must be a XLSX or XLS"`:

**Cause:** Incorrect MIME type sent with the file

**Solution:** Ensure you include the MIME type in the curl command:

```bash
-F 'file=@templates/combined-template.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
```

### Backend Service Not Routable

**Cause:** Usually related to malformed headers or incorrect URL

**Solution:**

- Verify the URL includes the service name: `/aqie-dc-backend/upload-and-scan/{id}`
- Check for any invalid headers
- Ensure you're using the correct gateway URL

### No Callback Received

**Check:**

1. Service logs in CDP Portal for `/upload-callback` requests
2. Upload status shows `fileStatus: "complete"`
3. No errors in the service logs around the upload time

## Notes

- Upload sessions expire after a certain time period
- Always use fresh uploadIds for each test
- The callback to `/upload-callback` happens automatically after successful virus scan and S3 upload
- CDP Uploader uses internal service-to-service communication for callbacks
