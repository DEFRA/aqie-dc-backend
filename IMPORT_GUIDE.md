# Data Update Quick Reference Guide

## When You Receive an Excel File Update

### Step 1: Generate Template (First Time Only)

```bash
node src/migrations/generate-excel-template.js
```

### Step 2: Prepare Your Data

1. Open the appropriate template file from `templates/`
2. Keep the header row unchanged
3. Replace sample data with your actual data
4. Add as many rows as needed
5. Save the file

### Step 3: Import Data

#### In CDP Terminal (Any Environment)

```bash
# Upload your Excel file using the Files tab in CDP Terminal
# Then run:
node src/migrations/import-from-excel.js --file /home/your-file.xlsx --type both --verbose
```

#### On Your Local Machine

```bash
node src/migrations/import-from-excel.js --file /path/to/your-file.xlsx --type appliances
```

#### Via API (if you have a UI)

```bash
curl -X POST http://your-api/import \
  -F "file=@/path/to/your-file.xlsx" \
  -F "type=both"
```

## Data Types Reference

### Appliances (`--type appliances`)

**Required Columns:**

- applianceId (unique)
- manufacturer
- manufacturerAddress
- manufacturerContactName
- manufacturerContactEmail
- manufacturerPhone
- modelName
- modelNumber
- applianceType (Stove, Boiler, Fire, Heater, Other)
- isVariant (Yes/No)
- nominalOutput (number)
- allowedFuels
- instructionManualTitle
- instructionManualDate
- instructionManualReference
- submittedBy
- approvedBy
- publishedDate

**Optional Columns:**

- manufacturerAlternateEmail
- existingAuthorisedAppliance
- permittedFuels (comma-separated fuel IDs)
- additionalConditions

### Fuels (`--type fuels`)

**Required Columns:**

- fuelId (unique)
- manufacturerName
- manufacturerAddress
- manufacturerContactName
- manufacturerContactEmail
- manufacturerPhone
- representativeName
- representativeEmail
- hasCustomerComplaints (Yes/No)
- qualityControlSystem
- certificationScheme
- fuelName
- fuelBagging (Bagged, Loose, Bulk)
- isBaggedAtSource (Yes/No)
- fuelDescription
- fuelWeight
- fuelComposition
- sulphurContent (0-100)
- manufacturingProcess
- isRebrandedProduct (Yes/No)
- hasChangedFromOriginal (Yes/No)

**Optional Columns:**

- manufacturerAlternateEmail
- brandNames (comma-separated)

## What Happens During Import

✅ **New Records** → Inserted into database  
✅ **Existing Records** (same ID) → Updated with new values  
✅ **Invalid Records** → Logged as errors, skip to next  
✅ **Automatic Timestamps** → `createdAt` (new only), `updatedAt` (always)

## Common Issues

### "Missing required field"

- Check all required columns are present
- Ensure no cells are empty for required fields

### "Invalid email format"

- Use valid email format: name@domain.com
- Check for spaces or special characters

### "Invalid enum value"

- applianceType: Must be Stove, Boiler, Fire, Heater, or Other (case-sensitive)
- fuelBagging: Must be Bagged, Loose, or Bulk (case-sensitive)

### "Duplicate key error"

- Two rows have the same ID
- Check for duplicate applianceId or fuelId values

## Update Schedule Examples

### Weekly Updates

```bash
# Every week when you receive the file
node src/migrations/import-from-excel.js --file weekly-update.xlsx --type both
```

### Monthly Updates

```bash
# Once a month
node src/migrations/import-from-excel.js --file monthly-update.xlsx --type appliances
```

### Ad-hoc Updates (1 week to 5 months)

```bash
# Whenever you receive an update
node src/migrations/import-from-excel.js --file adhoc-update.xlsx --type both --verbose
```

## Verification

After import, check the results:

```bash
# In mongosh or CDP Terminal
mongosh
> db.Appliances.countDocuments()
> db.Fuels.countDocuments()
> db.Appliances.find().limit(5)
```

## Tips

1. **Keep a backup**: Always save the Excel file before importing
2. **Use verbose mode**: Add `--verbose` to see each record being processed
3. **Test first**: Try with a small file first to verify format
4. **Check logs**: Review output for any failed records
5. **Environment specific**: Each environment (dev/test/prod) needs separate imports
