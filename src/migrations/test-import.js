/**
 * Test script for Excel import
 * Generates sample data and tests the import process
 */

import { importFromExcel } from './import-from-excel.js'
import applianceExample from '../sample-data/appliance-example.js'
import fuelExample from '../sample-data/fuel-example.js'
import { MongoClient } from 'mongodb'
import { config } from '../config.js'
import xlsx from 'xlsx'
import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'

// Sample test data from sample-data folder
const testAppliances = [applianceExample]
const testFuels = [fuelExample]

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
