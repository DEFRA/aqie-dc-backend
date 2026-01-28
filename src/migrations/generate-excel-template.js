/**
 * Generate Excel templates for Appliances and Fuels
 *
 * Usage:
 * node src/migrations/generate-excel-template.js
 */

import xlsx from 'xlsx'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// Template data with column headers and sample row
const appliancesTemplate = [
  {
    applianceId: 'APP001',
    manufacturer: 'Stoves LTD',
    manufacturerAddress: '24 Bowerfield Lane Newcastle NE638BO',
    manufacturerContactName: 'Joe Bloggs',
    manufacturerContactEmail: 'Joe.bloggs@gmail.com',
    manufacturerAlternateEmail: 'Joe.bloggs2@gmail.com',
    manufacturerPhone: '7846638263',
    modelName: 'Hot Stove 89',
    modelNumber: 'AHS231',
    applianceType: 'Stove',
    isVariant: 'Yes',
    existingAuthorisedAppliance: 'Hot Stove 88',
    nominalOutput: '12',
    allowedFuels: 'Wood Logs, Wood Pellets',
    permittedFuels: 'FUEL001, FUEL002',
    instructionManualTitle: 'Stove manual instructions',
    instructionManualDate: '01/07/2024',
    instructionManualReference: 'Issue 08',
    additionalConditions:
      'Must be fitted with the supplied secondary air control limiters',
    submittedBy: 'Phil Mitchell',
    approvedBy: 'Bruce Lee',
    publishedDate: '04/02/2025'
  }
]

const fuelsTemplate = [
  {
    fuelId: 'FUEL001',
    manufacturerName: 'Fuels Company Ltd',
    manufacturerAddress: '24 Bowerfield Lane Newcastle NE638BO',
    manufacturerContactName: 'Joe Bloggs',
    manufacturerContactEmail: 'Joe.bloggs@gmail.com',
    manufacturerAlternateEmail: 'Joe.bloggs2@gmail.com',
    manufacturerPhone: '7846638263',
    representativeName: 'Simon Gates',
    representativeEmail: 'Simon.Gates@FuelsLTD.com',
    hasCustomerComplaints: 'No',
    qualityControlSystem: 'ISO 9001 certified',
    certificationScheme: 'Fuel authorisation under the Clean Air Act 1993',
    fuelName: 'Eco Briquettes Premium',
    fuelBagging: 'Bagged',
    isBaggedAtSource: 'Yes',
    fuelDescription: 'Pillow-shaped briquettes with single line indentation',
    fuelWeight: 'Average weight of 125 to 135 grams per briquette',
    fuelComposition: 'Anthracite fines (60% to 80%)',
    sulphurContent: '20',
    manufacturingProcess:
      'Roll pressing and heat treatment at 300 degrees celsius',
    isRebrandedProduct: 'No',
    hasChangedFromOriginal: 'No',
    brandNames: 'Fuel brand 1, Fuel brand 2'
  }
]

function generateTemplate() {
  console.log('🚀 Generating Excel templates...\n')

  // Create templates directory if it doesn't exist
  const templatesDir = join(process.cwd(), 'templates')
  if (!existsSync(templatesDir)) {
    mkdirSync(templatesDir, { recursive: true })
  }

  // Create Appliances template
  const appliancesWorkbook = xlsx.utils.book_new()
  const appliancesSheet = xlsx.utils.json_to_sheet(appliancesTemplate)

  // Set column widths
  appliancesSheet['!cols'] = [
    { wch: 15 }, // applianceId
    { wch: 20 }, // manufacturer
    { wch: 40 }, // manufacturerAddress
    { wch: 20 }, // manufacturerContactName
    { wch: 30 }, // manufacturerContactEmail
    { wch: 30 }, // manufacturerAlternateEmail
    { wch: 15 }, // manufacturerPhone
    { wch: 25 }, // modelName
    { wch: 15 }, // modelNumber
    { wch: 12 }, // applianceType
    { wch: 10 }, // isVariant
    { wch: 25 }, // existingAuthorisedAppliance
    { wch: 12 }, // nominalOutput
    { wch: 30 }, // allowedFuels
    { wch: 25 }, // permittedFuels
    { wch: 30 }, // instructionManualTitle
    { wch: 15 }, // instructionManualDate
    { wch: 20 }, // instructionManualReference
    { wch: 50 }, // additionalConditions
    { wch: 20 }, // submittedBy
    { wch: 20 }, // approvedBy
    { wch: 15 } // publishedDate
  ]

  xlsx.utils.book_append_sheet(
    appliancesWorkbook,
    appliancesSheet,
    'Appliances'
  )

  const appliancesPath = join(templatesDir, 'appliances-import-template.xlsx')
  xlsx.writeFile(appliancesWorkbook, appliancesPath)
  console.log(`✅ Appliances template created: ${appliancesPath}`)

  // Create Fuels template
  const fuelsWorkbook = xlsx.utils.book_new()
  const fuelsSheet = xlsx.utils.json_to_sheet(fuelsTemplate)

  // Set column widths
  fuelsSheet['!cols'] = [
    { wch: 15 }, // fuelId
    { wch: 25 }, // manufacturerName
    { wch: 40 }, // manufacturerAddress
    { wch: 20 }, // manufacturerContactName
    { wch: 30 }, // manufacturerContactEmail
    { wch: 30 }, // manufacturerAlternateEmail
    { wch: 15 }, // manufacturerPhone
    { wch: 20 }, // representativeName
    { wch: 30 }, // representativeEmail
    { wch: 15 }, // hasCustomerComplaints
    { wch: 30 }, // qualityControlSystem
    { wch: 40 }, // certificationScheme
    { wch: 30 }, // fuelName
    { wch: 12 }, // fuelBagging
    { wch: 15 }, // isBaggedAtSource
    { wch: 50 }, // fuelDescription
    { wch: 35 }, // fuelWeight
    { wch: 40 }, // fuelComposition
    { wch: 12 }, // sulphurContent
    { wch: 50 }, // manufacturingProcess
    { wch: 15 }, // isRebrandedProduct
    { wch: 18 }, // hasChangedFromOriginal
    { wch: 30 } // brandNames
  ]

  xlsx.utils.book_append_sheet(fuelsWorkbook, fuelsSheet, 'Fuels')

  const fuelsPath = join(templatesDir, 'fuels-import-template.xlsx')
  xlsx.writeFile(fuelsWorkbook, fuelsPath)
  console.log(`✅ Fuels template created: ${fuelsPath}`)

  // Create combined template
  const combinedWorkbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(combinedWorkbook, appliancesSheet, 'Appliances')
  xlsx.utils.book_append_sheet(combinedWorkbook, fuelsSheet, 'Fuels')

  const combinedPath = join(templatesDir, 'combined-import-template.xlsx')
  xlsx.writeFile(combinedWorkbook, combinedPath)
  console.log(`✅ Combined template created: ${combinedPath}`)

  console.log('\n📋 Template files created successfully!')
  console.log('\nInstructions:')
  console.log('1. Open the template file in Excel')
  console.log('2. Keep the header row (first row) as is')
  console.log('3. Replace the sample data row with your actual data')
  console.log('4. Add more rows as needed')
  console.log(
    '5. Save and import using: node src/migrations/import-from-excel.js --file <path>'
  )
}

generateTemplate()
