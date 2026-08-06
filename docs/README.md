# Documentation

This folder contains detailed documentation for the aqie-dc-backend service.

## Excel Import from S3

The backend supports importing Excel files directly from S3 buckets for data population and migration.

### Quick Start

- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Complete overview of the S3 import implementation, architecture, and configuration

## Import Flows

### CLI Import (Development & Testing)

For manual imports from local Excel files:

```bash
npm run import:appliances --file path/to/file.xlsx --type appliances
npm run import:appliances --file path/to/file.xlsx --type fuels
npm run import:appliances --file path/to/file.xlsx --type both --verbose
```

See [import-from-excel.js](../src/migrations/import-from-excel.js) for details.

### API Import (Production)

For programmatic imports from S3:

```
POST /import
```

Accepts S3 bucket and key, downloads the file, imports data to MongoDB.

See [s3-import.js](../src/routes/s3-import.js) for details.

## Entity Configuration

All entity types (Appliances, Fuels, Applications) are defined in:

- **[entity-config.js](../src/common/helpers/entity-config.js)** - Central configuration with column mappings, transform functions, and sample data

## Archive (No Longer Used)

The `cdp-uploader/` folder contains legacy documentation for the previous CDP Uploader-based workflow:

- CDP_UPLOADER_IMPLEMENTATION.md - Previous implementation (archived)
- CDP_UPLOADER_TESTING.md - Previous testing guide (archived)
- TESTING_GUIDE.md - Previous testing instructions (archived)

These are kept for reference only. The import flow now starts directly from S3.
