# 🚀 Admin Upload Page - Quick Start Guide

## Access the Admin Page

Once your application is running, navigate to:

**Local:** `http://localhost:3001/admin/import`

**DEV:** `https://your-service-dev.cdp-int.defra.cloud/admin/import`

**TEST:** `https://your-service-test.cdp-int.defra.cloud/admin/import`

**PROD:** `https://your-service-prod.cdp-int.defra.cloud/admin/import`

## How to Use

### Step 1: Download Template (First Time)

Click one of the template download links on the page:

- **Appliances Template** - For appliances data only
- **Fuels Template** - For fuels data only
- **Combined Template** - For both appliances and fuels

### Step 2: Fill in Your Data

1. Open the downloaded Excel template
2. **Keep the header row (first row) unchanged**
3. Replace the sample data row with your actual data
4. Add as many additional rows as needed
5. Save the file

### Step 3: Upload and Import

1. Click "Choose File" and select your Excel file
2. Select the **Import Type**:
   - **Both** - Import both appliances and fuels (default)
   - **Appliances Only** - Import only appliances sheet
   - **Fuels Only** - Import only fuels sheet
3. (Optional) Check "Show detailed import logs" for verbose output
4. Click **Import Data**

### Step 4: Review Results

The page will show:

- ✅ Number of records **inserted** (new)
- ↻ Number of records **updated** (existing)
- ✗ Number of records **failed** (errors)
- Full JSON response with details

## Features

✅ **Drag & drop** file upload  
✅ **Real-time progress** indicator  
✅ **Detailed results** display  
✅ **Template downloads** built-in  
✅ **Error reporting** with details  
✅ **No terminal access** needed

## When You Receive a New Excel File

```
1. Save the Excel file to your computer
   ↓
2. Open http://your-service/admin/import in browser
   ↓
3. Upload the file
   ↓
4. Click "Import Data"
   ↓
5. Review results
   ↓
Done! ✅
```

## Important Notes

- **File Size Limit:** 10MB maximum
- **File Format:** Must be .xlsx or .xls
- **Required Fields:** All required fields must have values
- **UPSERT Logic:**
  - New records (new IDs) → Inserted
  - Existing records (same IDs) → Updated
- **Timestamps:**
  - `createdAt` preserved for existing records
  - `updatedAt` always set to current time

## Troubleshooting

### "Invalid file format"

- Ensure file is .xlsx or .xls (not .csv)
- Re-download template and try again

### "Missing required field"

- Check all required columns have values
- Compare your file with the template

### "Invalid email format"

- Ensure emails follow: name@domain.com
- Check for spaces or special characters

### Import shows 0 inserted/updated

- Verify you have data rows (not just headers)
- Check the import type matches your sheet names

### Page not loading

- Ensure your application is running
- Check the URL is correct
- Verify no firewall blocking

## Security Note

**TODO:** Add authentication to `/admin/import` route before deploying to production!

Update `src/routes/admin-import.js`:

```javascript
options: {
  auth: 'your-auth-strategy' // Replace false with your auth strategy
}
```

## API Endpoint (Alternative)

If you prefer programmatic access:

```bash
curl -X POST http://localhost:3001/import \
  -F "file=@/path/to/data.xlsx" \
  -F "type=both"
```

## Support

For issues or questions:

- Check the console logs for detailed error messages
- Review `IMPORT_GUIDE.md` for more information
- Contact your development team

---

**Ready to import!** Just navigate to `/admin/import` and start uploading.
