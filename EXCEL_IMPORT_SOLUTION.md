# Excel Import System - Complete Solution

## 📋 Overview

A flexible system for importing and updating MongoDB collections from Excel files at any schedule (weekly, monthly, or ad-hoc). Uses **UPSERT** logic to insert new records and update existing ones.

## 🎯 Solution for Your Use Case

Your requirement: "Sometimes weekly, sometimes 3-5 months, sometimes 1 week between updates"

**Perfect! This system handles:**

- ✅ Irregular update schedules
- ✅ Any frequency (daily to yearly)
- ✅ Both new data and updates
- ✅ Works in all environments (dev, test, prod)
- ✅ Can be run manually or via API

## 📁 Files Created

### Core Migration Files

- `src/migrations/setup-appliances-fuels.js` - Automatic collection setup
- `src/migrations/import-from-excel.js` - Excel import engine
- `src/migrations/generate-excel-template.js` - Template generator
- `src/migrations/init-appliances-fuels.js` - MongoDB shell script
- `src/migrations/test-import.js` - Test script
- `src/migrations/README.md` - Detailed documentation

### Routes & Helpers

- `src/routes/import.js` - API endpoint for file uploads
- `src/common/helpers/mongodb.js` - Updated with auto-setup

### Documentation

- `IMPORT_GUIDE.md` - Quick reference guide
- `templates/` - Generated Excel templates (after running generator)

## 🚀 Quick Start

### 1. First Time Setup (Automatic)

Collections are created automatically when your app starts. No action needed!

### 2. Generate Excel Templates

```bash
node src/migrations/generate-excel-template.js
```

This creates templates in `templates/` folder.

### 3. When You Receive Data to Update

**Option A: Command Line (Best for CDP Terminal)**

```bash
node src/migrations/import-from-excel.js --file your-data.xlsx --type both --verbose
```

**Option B: API Endpoint**

```bash
curl -X POST http://localhost:3001/import \
  -F "file=@your-data.xlsx" \
  -F "type=both"
```

**Option C: Test Locally First**

```bash
node src/migrations/test-import.js
```

## 🔄 How UPSERT Works

### New Records (applianceId/fuelId not in DB)

- Inserted with all fields
- `createdAt` set to current timestamp
- `updatedAt` set to current timestamp

### Existing Records (applianceId/fuelId already exists)

- Updated with new values
- `createdAt` preserved from original
- `updatedAt` set to current timestamp

### Example

```javascript
// First import (Week 1)
{ applianceId: "APP001", manufacturer: "Old Name", ... }
→ Inserted (new record)

// Second import (5 months later)
{ applianceId: "APP001", manufacturer: "New Name", ... }
→ Updated (manufacturer changed, createdAt preserved)

// Third import (1 week later)
{ applianceId: "APP002", manufacturer: "Another Company", ... }
→ Inserted (new record)
```

## 📊 Excel File Format

### Column Headers

Use the generated templates - they have all the correct column names.

**Key Points:**

- First row = headers (keep as is)
- Required columns must have values
- Optional columns can be empty
- Column names are flexible (supports variations)

### Data Formats

- **Dates**: DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD
- **Booleans**: Yes/No, True/False, 1/0, Y/N
- **Numbers**: Plain numbers (15, 12.5)
- **Arrays**: Comma-separated (FUEL001, FUEL002)
- **Emails**: Must be valid format (name@domain.com)

## 🌍 Environment Deployment

### How It Works Across Environments

1. **DEV Environment**
   - Deploy → Collections auto-created
   - Import Excel → Updates DEV database only
2. **TEST Environment**
   - Deploy → Collections auto-created
   - Import Excel → Updates TEST database only
3. **PROD Environment**
   - Deploy → Collections auto-created
   - Import Excel → Updates PROD database only

**Each environment is completely isolated!**

### Typical Workflow

```bash
# In DEV (test your Excel file)
node src/migrations/import-from-excel.js --file new-data.xlsx --type both

# Verify in DEV, then in TEST (via CDP Terminal)
node src/migrations/import-from-excel.js --file new-data.xlsx --type both

# Finally in PROD (via CDP Terminal)
node src/migrations/import-from-excel.js --file new-data.xlsx --type both
```

## 📅 Update Schedules Examples

### Scenario 1: Regular Weekly Updates

```bash
# Every Monday when you receive the file
node src/migrations/import-from-excel.js --file weekly-update.xlsx --type both
```

### Scenario 2: Irregular Updates (Your Case)

```bash
# Whenever you receive an update (1 week to 5 months)
node src/migrations/import-from-excel.js --file adhoc-update-2026-01.xlsx --type both
# ... 3 months later
node src/migrations/import-from-excel.js --file adhoc-update-2026-04.xlsx --type both
# ... 1 week later
node src/migrations/import-from-excel.js --file adhoc-update-2026-04b.xlsx --type both
```

### Scenario 3: Different Types at Different Times

```bash
# Update just appliances
node src/migrations/import-from-excel.js --file appliances-only.xlsx --type appliances

# Update just fuels (2 months later)
node src/migrations/import-from-excel.js --file fuels-only.xlsx --type fuels

# Update both together
node src/migrations/import-from-excel.js --file combined.xlsx --type both
```

## 🔒 CDP Terminal Usage

### Upload and Import in CDP Environment

1. Access CDP Terminal for your environment
2. Click "Files" tab
3. Upload your Excel file
4. Run import command:

```bash
node src/migrations/import-from-excel.js --file /home/your-file.xlsx --type both --verbose
```

### Check Results

```bash
mongosh
> db.Appliances.countDocuments()
> db.Fuels.countDocuments()
> db.Appliances.find({ applianceId: "APP001" })
```

## 🧪 Testing

### Local Test

```bash
# Generates test data and imports it
node src/migrations/test-import.js
```

### Manual Test

```bash
# Generate templates
node src/migrations/generate-excel-template.js

# Edit a template with your test data

# Import it
node src/migrations/import-from-excel.js --file templates/appliances-import-template.xlsx --type appliances --verbose
```

## 📦 Dependencies Added

- `xlsx` (0.18.5) - Excel file parsing
- `date-fns` (4.1.0) - Date parsing and validation

## ⚙️ Configuration

No configuration needed! Uses your existing MongoDB connection from `config.js`.

## 🎨 API Endpoint Details

### POST /import

**Request:**

```javascript
{
  file: <Excel file>,
  type: "appliances" | "fuels" | "both",
  appliancesSheet: "Appliances",  // optional
  fuelsSheet: "Fuels"              // optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Import completed successfully",
  "results": {
    "appliances": {
      "inserted": 5,
      "updated": 10,
      "failed": 0
    },
    "fuels": {
      "inserted": 3,
      "updated": 7,
      "failed": 0
    }
  }
}
```

## ✅ Benefits

1. **Flexible Schedule** - Run whenever you need (no fixed schedule required)
2. **Safe Updates** - UPSERT logic prevents duplicates, preserves history
3. **Validation** - Schema validation ensures data quality
4. **Auditable** - Timestamps track when records were created/updated
5. **Environment Isolation** - Each environment has separate data
6. **Easy to Use** - Simple command line or API
7. **Error Handling** - Reports which records succeeded/failed
8. **Template Driven** - Consistent Excel format

## 🆘 Troubleshooting

See `IMPORT_GUIDE.md` for detailed troubleshooting steps.

Quick fixes:

- Missing columns → Use generated templates
- Invalid data → Check data formats section
- Import fails → Run with `--verbose` flag
- Schema errors → Verify required fields are filled

## 📚 Documentation

- `src/migrations/README.md` - Full technical documentation
- `IMPORT_GUIDE.md` - Quick reference guide
- Code comments - Inline documentation

## 🎯 Summary

You now have a complete system for handling irregular database updates via Excel:

✅ Collections auto-created on app start  
✅ Excel templates generated on demand  
✅ Import via command line or API  
✅ Works in all environments  
✅ No fixed schedule required  
✅ Safe upsert logic  
✅ Full validation and error reporting

**Ready to use!** Just generate templates and start importing when you receive data.
