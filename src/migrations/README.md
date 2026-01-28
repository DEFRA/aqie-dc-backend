# Database Migrations

This directory contains MongoDB migration scripts for the AQIE DC Backend.

## Appliances and Fuels Collections

### Automatic Setup (Recommended)

The `Appliances` and `Fuels` collections are **automatically created** when your application starts. The migration runs during the MongoDB plugin initialization in `src/common/helpers/mongodb.js`.

- Collections are only created if they don't already exist
- Schema validation and indexes are automatically applied
- No manual intervention required

### Manual Execution

If you need to run the migration manually or want more control:

#### Option 1: Run as a standalone script

```bash
# Basic setup (no sample data)
node src/migrations/setup-appliances-fuels.js

# With sample data
node src/migrations/setup-appliances-fuels.js --samples

# Drop existing collections and recreate
node src/migrations/setup-appliances-fuels.js --drop --samples
```

#### Option 2: Import and use programmatically

```javascript
import { setupAppliancesAndFuels } from './migrations/setup-appliances-fuels.js'

// In your code where you have access to db
await setupAppliancesAndFuels(db, {
  dropExisting: false, // Set to true to drop existing collections
  insertSamples: true // Set to true to insert sample data
})
```

#### Option 3: Use the MongoDB shell script

For CDP Terminal or direct MongoDB access:

```bash
mongosh < src/migrations/init-appliances-fuels.js
```

## Collections Overview

### Appliances Collection

Stores information about heating appliances (stoves, boilers, fires, heaters).

**Key Fields:**

- `applianceId` (unique) - Appliance identifier
- `manufacturer` - Manufacturer details
- `modelName`, `modelNumber` - Product information
- `applianceType` - Type: Stove, Boiler, Fire, Heater, Other
- `nominalOutput` - Output in kW
- `allowedFuels` - Permitted fuels
- File attachments for test reports, drawings, certificates

**Indexes:**

- `applianceId` (unique)
- `manufacturer`
- `modelName`
- `applianceType`
- `publishedDate` (descending)

### Fuels Collection

Stores information about approved fuels.

**Key Fields:**

- `fuelId` (unique) - Fuel identifier
- `manufacturerName` - Manufacturer details
- `fuelName` - Product name
- `fuelBagging` - Bagged, Loose, or Bulk
- `certificationScheme` - Certification details
- `sulphurContent` - Percentage (0-100)
- Multiple file attachments for test reports and documents

**Indexes:**

- `fuelId` (unique)
- `manufacturerName`
- `fuelName`
- `fuelBagging`
- `certificationScheme`

## Schema Validation

Both collections have **strict schema validation** enforced at the database level:

- ✅ Required fields validation
- ✅ Email pattern validation
- ✅ Enum constraints for specific fields
- ✅ Type checking (string, number, boolean, date, array, object)
- ✅ Numeric range validation

Invalid documents will be rejected by MongoDB automatically.

## Environment Isolation

Remember: Each CDP environment (dev, test, prod) has **isolated databases**. Migrations run independently in each environment.

## Importing/Updating Data from Excel

When you receive Excel files with updates (weekly, monthly, or any schedule), use the import system:

### Generate Excel Templates

First, generate the Excel templates:

```bash
node src/migrations/generate-excel-template.js
```

This creates three template files in `templates/`:

- `appliances-import-template.xlsx` - For appliances only
- `fuels-import-template.xlsx` - For fuels only
- `combined-import-template.xlsx` - For both in one file

### Import Data

#### Method 1: Command Line (Recommended for CDP Terminal)

```bash
# Import appliances only
node src/migrations/import-from-excel.js --file path/to/appliances.xlsx --type appliances

# Import fuels only
node src/migrations/import-from-excel.js --file path/to/fuels.xlsx --type fuels

# Import both from combined file
node src/migrations/import-from-excel.js --file path/to/combined.xlsx --type both

# Show verbose output
node src/migrations/import-from-excel.js --file path/to/data.xlsx --type both --verbose
```

#### Method 2: API Endpoint

```bash
# Upload and import via API
curl -X POST http://localhost:3001/import \
  -F "file=@path/to/appliances.xlsx" \
  -F "type=appliances"
```

### How It Works

The import system uses **UPSERT** logic:

- **New records**: Inserted with all fields
- **Existing records** (matching ID): Updated with new values
- **Failed records**: Logged with error details

**Key Features:**

- ✅ Automatically handles inserts and updates
- ✅ Preserves `createdAt` timestamp for existing records
- ✅ Updates `updatedAt` timestamp on every import
- ✅ Validates data against schema rules
- ✅ Reports success/failure for each record
- ✅ Flexible column name mapping (supports common variations)

### Excel File Requirements

**Column Headers** (case-insensitive, supports variations):

- Must include all **required** fields from the schema
- Can use variations like "Contact Email" or "manufacturerContactEmail"
- Optional fields can be left empty

**Data Format:**

- Dates: DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD
- Booleans: Yes/No, True/False, 1/0, Y/N
- Numbers: Plain numbers (no formatting symbols)
- Arrays: Comma-separated values (e.g., "FUEL001, FUEL002")

**Example Appliances columns:**

```
applianceId | manufacturer | manufacturerAddress | Contact Email | Model Name | Appliance Type | ...
```

**Example Fuels columns:**

```
fuelId | manufacturerName | manufacturerAddress | Contact Email | Fuel Name | Fuel Bagging | ...
```

### Update Workflow

1. **Get template**: `node src/migrations/generate-excel-template.js`
2. **Fill in data**: Open template, add/update rows
3. **Import**: Use command line or API
4. **Verify**: Check logs for import results

### Scheduling Updates

Since updates come at irregular intervals (1 week to 5 months):

**Option A - Manual (Best for irregular schedules)**

- Keep Excel templates ready
- When you receive updates, run import script
- Works in any environment via CDP Terminal

**Option B - API Upload (Best for user-driven updates)**

- Use the `/import` endpoint
- Can be integrated into admin UI
- Requires file upload capability

**Option C - Automated (if predictable)**

- Store Excel files in S3
- Create a scheduled task to check and import
- Only needed if updates become regular

## Troubleshooting

**Collections not created?**

- Check application logs on startup
- Ensure MongoDB connection is successful
- Run manually with `node src/migrations/setup-appliances-fuels.js`

**Schema validation errors during import?**

- Ensure all required fields are provided
- Check email formats match the regex pattern
- Verify enum values (e.g., applianceType must be one of: Stove, Boiler, Fire, Heater, Other)
- Check date formats are recognized

**Import failed?**

- Review error messages in console output
- Use `--verbose` flag for detailed logging
- Check Excel file has correct column headers
- Ensure file is .xlsx or .xls format

**Need to reset collections?**

- Use `--drop` flag when running manually
- Or use CDP Terminal: `db.Appliances.drop()` then restart your app
