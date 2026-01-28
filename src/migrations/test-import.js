/**
 * Test script for Excel import
 * Generates sample data and tests the import process
 */

import { importFromExcel } from './import-from-excel.js'
import { MongoClient } from 'mongodb'
import { config } from '../config.js'
import xlsx from 'xlsx'
import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'

// Sample test data
const testAppliances = [
  {
    applianceId: 'TEST-APP-001',
    manufacturer: 'Test Stoves Ltd',
    manufacturerAddress: '123 Test Street, Test City, TS1 2AB',
    manufacturerContactName: 'John Test',
    manufacturerContactEmail: 'john.test@teststoves.com',
    manufacturerPhone: '01234567890',
    modelName: 'Test Stove Pro',
    modelNumber: 'TSP-2024',
    applianceType: 'Stove',
    isVariant: 'No',
    nominalOutput: '15',
    allowedFuels: 'Wood Logs, Pellets',
    instructionManualTitle: 'Test Stove Pro Manual',
    instructionManualDate: '01/01/2024',
    instructionManualReference: 'Rev 1.0',
    submittedBy: 'Test User',
    approvedBy: 'Test Approver',
    publishedDate: '15/01/2024'
  },
  {
    applianceId: 'TEST-APP-002',
    manufacturer: 'Test Boilers Inc',
    manufacturerAddress: '456 Boiler Avenue, Heat City, HC3 4CD',
    manufacturerContactName: 'Jane Smith',
    manufacturerContactEmail: 'jane.smith@testboilers.com',
    manufacturerPhone: '09876543210',
    modelName: 'EcoHeat 3000',
    modelNumber: 'EH-3000',
    applianceType: 'Boiler',
    isVariant: 'Yes',
    existingAuthorisedAppliance: 'EcoHeat 2000',
    nominalOutput: '25',
    allowedFuels: 'Natural Gas, LPG',
    instructionManualTitle: 'EcoHeat 3000 Installation Guide',
    instructionManualDate: '15/02/2024',
    instructionManualReference: 'Rev 2.1',
    submittedBy: 'Engineering Team',
    approvedBy: 'Safety Officer',
    publishedDate: '01/03/2024'
  }
]

const testFuels = [
  {
    fuelId: 'TEST-FUEL-001',
    manufacturerName: 'Green Fuel Co',
    manufacturerAddress: '789 Eco Street, Green City, GC5 6EF',
    manufacturerContactName: 'Bob Green',
    manufacturerContactEmail: 'bob.green@greenfuel.com',
    manufacturerPhone: '01122334455',
    representativeName: 'Alice Brown',
    representativeEmail: 'alice.brown@greenfuel.com',
    hasCustomerComplaints: 'No',
    qualityControlSystem: 'ISO 9001:2015 Certified',
    certificationScheme: 'Clean Air Act 1993 Approved',
    fuelName: 'Eco Premium Briquettes',
    fuelBagging: 'Bagged',
    isBaggedAtSource: 'Yes',
    fuelDescription: 'High-quality compressed wood briquettes',
    fuelWeight: '10kg bags',
    fuelComposition: 'Compressed sawdust (100%)',
    sulphurContent: '5',
    manufacturingProcess: 'High-pressure compression',
    isRebrandedProduct: 'No',
    hasChangedFromOriginal: 'No'
  }
]

async function runTest() {
  console.log('🧪 Running Excel Import Test\n')

  let client
  let testFile

  try {
    // Create test Excel file
    console.log('📝 Creating test Excel file...')
    const workbook = xlsx.utils.book_new()

    const appliancesSheet = xlsx.utils.json_to_sheet(testAppliances)
    xlsx.utils.book_append_sheet(workbook, appliancesSheet, 'Appliances')

    const fuelsSheet = xlsx.utils.json_to_sheet(testFuels)
    xlsx.utils.book_append_sheet(workbook, fuelsSheet, 'Fuels')

    testFile = join(tmpdir(), `test-import-${Date.now()}.xlsx`)
    xlsx.writeFile(workbook, testFile)
    console.log(`   ✓ Test file created: ${testFile}\n`)

    // Connect to database
    console.log('🔌 Connecting to database...')
    const mongoUrl = config.get('mongo.uri')
    const databaseName = config.get('mongo.databaseName')

    client = await MongoClient.connect(mongoUrl)
    const db = client.db(databaseName)
    console.log(`   ✓ Connected to: ${databaseName}\n`)

    // Run import
    console.log('📥 Starting import test...')
    const results = await importFromExcel(db, testFile, 'both', {
      verbose: true
    })

    // Verify results
    console.log('\n🔍 Verifying import...')
    const appliancesCount = await db.collection('Appliances').countDocuments({
      applianceId: { $regex: /^TEST-APP-/ }
    })
    const fuelsCount = await db.collection('Fuels').countDocuments({
      fuelId: { $regex: /^TEST-FUEL-/ }
    })

    console.log(`   ✓ Test Appliances in DB: ${appliancesCount}`)
    console.log(`   ✓ Test Fuels in DB: ${fuelsCount}`)

    // Display imported records
    console.log('\n📋 Imported Appliances:')
    const appliances = await db
      .collection('Appliances')
      .find({ applianceId: { $regex: /^TEST-APP-/ } })
      .toArray()
    appliances.forEach((a) => {
      console.log(`   - ${a.applianceId}: ${a.modelName} (${a.manufacturer})`)
    })

    console.log('\n📋 Imported Fuels:')
    const fuels = await db
      .collection('Fuels')
      .find({ fuelId: { $regex: /^TEST-FUEL-/ } })
      .toArray()
    fuels.forEach((f) => {
      console.log(`   - ${f.fuelId}: ${f.fuelName} (${f.manufacturerName})`)
    })

    // Test update (re-import same data)
    console.log('\n🔄 Testing update (re-importing same data)...')
    const updateResults = await importFromExcel(db, testFile, 'both', {
      verbose: false
    })

    console.log('\n✅ Test completed successfully!')
    console.log('\nSummary:')
    console.log('  Initial Import:', JSON.stringify(results, null, 2))
    console.log('  Update Import:', JSON.stringify(updateResults, null, 2))

    // Cleanup option
    console.log('\n🧹 Cleanup:')
    console.log('To remove test data, run:')
    console.log(`  db.Appliances.deleteMany({ applianceId: /^TEST-APP-/ })`)
    console.log(`  db.Fuels.deleteMany({ fuelId: /^TEST-FUEL-/ })`)
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    throw error
  } finally {
    // Cleanup
    if (testFile) {
      try {
        unlinkSync(testFile)
        console.log('\n   ✓ Test file deleted')
      } catch (err) {
        console.warn('   ⚠ Could not delete test file:', err.message)
      }
    }

    if (client) {
      await client.close()
      console.log('   ✓ Database connection closed')
    }
  }
}

runTest()
