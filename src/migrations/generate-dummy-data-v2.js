/**
 * Generate Excel files with 100 random dummy entries for each entity
 * Supports: Appliances, Fuels, Users
 *
 * Usage:
 * node src/migrations/generate-dummy-data-v2.js
 */

import xlsx from 'xlsx'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// Random data generators
const manufacturers = [
  'Stoves Ltd',
  'Heat Masters',
  'Eco Fire Co',
  'Warm Home Industries',
  'Nordic Stoves',
  'British Burners',
  'Premier Heat',
  'Flame Tech',
  'Cozy Fires Ltd',
  'Green Heat Solutions'
]

const modelPrefixes = [
  'EcoFire',
  'HeatMaster',
  'WarmGlow',
  'FlameKing',
  'CozyBurn',
  'Nordic',
  'Premier',
  'Elite',
  'Classic',
  'Modern'
]

const applianceTypes = ['Stove', 'Boiler', 'Fireplace', 'Room Heater', 'Cooker']

const fuelTypes = [
  'Wood Logs',
  'Wood Pellets',
  'Coal',
  'Anthracite',
  'Eco Briquettes'
]

const fuelManufacturers = [
  'EcoFuel Ltd',
  'Green Energy Co',
  'Premium Fuels',
  'Natural Heat',
  'Biomass Solutions',
  'Clean Burn Ltd',
  'Sustainable Fuels',
  'Wood Pellet Pro',
  'Coal Masters',
  'Energy Experts'
]

const certificationSchemes = [
  'Fuel authorisation under the Clean Air Act 1993',
  'EN Plus A1 Certified',
  'BSL Approved',
  'RHI Compliant',
  'ISO 9001 Certified'
]

const fuelBaggingTypes = ['Bagged', 'Loose', 'Bulk']

const cities = [
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Glasgow',
  'Newcastle',
  'Liverpool',
  'Bristol',
  'Sheffield',
  'Edinburgh'
]

const firstNames = [
  'John',
  'Sarah',
  'Michael',
  'Emma',
  'David',
  'Lisa',
  'James',
  'Sophie',
  'Robert',
  'Emily',
  'William',
  'Olivia',
  'Thomas',
  'Charlotte',
  'Daniel',
  'Amelia'
]

const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Wilson',
  'Taylor',
  'Anderson',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin'
]

const organizations = [
  'DEFRA',
  'Environment Agency',
  'Local Council',
  'Energy UK',
  'Heating Association',
  'Green Alliance',
  'Building Control',
  'Fire Safety Ltd'
]

const userRoles = ['admin', 'user', 'installer', 'inspector', 'manufacturer']

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomDate(start, end) {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  )
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function randomEmail(firstName, lastName) {
  const domains = [
    'gmail.com',
    'outlook.com',
    'company.co.uk',
    'defra.gov.uk',
    'email.co.uk'
  ]
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomChoice(domains)}`
}

function randomPhone() {
  return `0${randomInt(1000000000, 9999999999)}`
}

function randomPostcode() {
  return `${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(1, 9)} ${randomInt(1, 9)}${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}`
}

function generateAppliances(count) {
  const appliances = []

  for (let i = 1; i <= count; i++) {
    const manufacturer = randomChoice(manufacturers)
    const modelPrefix = randomChoice(modelPrefixes)
    const modelNumber = randomInt(100, 999)
    const contactFirstName = randomChoice(firstNames)
    const contactLastName = randomChoice(lastNames)
    const contactName = `${contactFirstName} ${contactLastName}`
    const submitterName = `${randomChoice(firstNames)} ${randomChoice(lastNames)}`
    const approverName = `${randomChoice(firstNames)} ${randomChoice(lastNames)}`
    const city = randomChoice(cities)
    const postcode = randomPostcode()

    const allowedFuelsCount = randomInt(1, 3)
    const allowedFuelsList = []
    for (let j = 0; j < allowedFuelsCount; j++) {
      const fuel = randomChoice(fuelTypes)
      if (!allowedFuelsList.includes(fuel)) {
        allowedFuelsList.push(fuel)
      }
    }

    const permittedFuelsCount = randomInt(1, 3)
    const permittedFuelsList = []
    for (let j = 0; j < permittedFuelsCount; j++) {
      permittedFuelsList.push(
        `FUEL${String(randomInt(1, 100)).padStart(3, '0')}`
      )
    }

    appliances.push({
      applianceId: `APP${String(i).padStart(3, '0')}`,
      manufacturer,
      manufacturerAddress: `${randomInt(1, 999)} ${randomChoice(['High Street', 'Main Road', 'Park Lane', 'Station Road', 'Church Street'])} ${city} ${postcode}`,
      manufacturerContactName: contactName,
      manufacturerContactEmail: randomEmail(contactFirstName, contactLastName),
      manufacturerAlternateEmail: randomEmail(
        contactFirstName,
        `${contactLastName}2`
      ),
      manufacturerPhone: randomPhone(),
      modelName: `${modelPrefix} ${modelNumber}`,
      modelNumber: `${modelPrefix.substring(0, 3).toUpperCase()}${modelNumber}`,
      applianceType: randomChoice(applianceTypes),
      isVariant: randomChoice(['Yes', 'No']),
      existingAuthorisedAppliance:
        Math.random() > 0.5 ? `${modelPrefix} ${modelNumber - 1}` : '',
      nominalOutput: String(randomInt(5, 25)),
      allowedFuels: allowedFuelsList.join(', '),
      permittedFuels: permittedFuelsList.join(', '),
      instructionManualTitle: `${manufacturer} ${modelPrefix} Installation Guide`,
      instructionManualDate: randomDate(
        new Date(2020, 0, 1),
        new Date(2024, 11, 31)
      ),
      instructionManualReference: `Issue ${String(randomInt(1, 20)).padStart(2, '0')}`,
      additionalConditions:
        Math.random() > 0.5
          ? 'Must be fitted with the supplied secondary air control limiters'
          : '',
      submittedBy: submitterName,
      approvedBy: approverName,
      publishedDate: randomDate(new Date(2024, 0, 1), new Date(2025, 11, 31))
    })
  }

  return appliances
}

function generateFuels(count) {
  const fuels = []

  for (let i = 1; i <= count; i++) {
    const manufacturerName = randomChoice(fuelManufacturers)
    const contactFirstName = randomChoice(firstNames)
    const contactLastName = randomChoice(lastNames)
    const contactName = `${contactFirstName} ${contactLastName}`
    const repFirstName = randomChoice(firstNames)
    const repLastName = randomChoice(lastNames)
    const repName = `${repFirstName} ${repLastName}`
    const city = randomChoice(cities)
    const postcode = randomPostcode()
    const fuelType = randomChoice(fuelTypes)

    const brandCount = randomInt(1, 4)
    const brandNames = []
    for (let j = 0; j < brandCount; j++) {
      brandNames.push(
        `${randomChoice(['Eco', 'Premium', 'Classic', 'Super', 'Pro'])} ${fuelType} ${randomInt(1, 50)}`
      )
    }

    fuels.push({
      fuelId: `FUEL${String(i).padStart(3, '0')}`,
      manufacturerName,
      manufacturerAddress: `${randomInt(1, 999)} ${randomChoice(['High Street', 'Main Road', 'Park Lane', 'Station Road', 'Industrial Estate'])} ${city} ${postcode}`,
      manufacturerContactName: contactName,
      manufacturerContactEmail: randomEmail(contactFirstName, contactLastName),
      manufacturerAlternateEmail: randomEmail(
        contactFirstName,
        `${contactLastName}2`
      ),
      manufacturerPhone: randomPhone(),
      representativeName: repName,
      representativeEmail: randomEmail(repFirstName, repLastName),
      hasCustomerComplaints: randomChoice(['Yes', 'No']),
      qualityControlSystem: randomChoice([
        'ISO 9001 certified',
        'BS EN certified',
        'Internal QC system',
        'Third-party audited'
      ]),
      certificationScheme: randomChoice(certificationSchemes),
      fuelName: `${randomChoice(['Premium', 'Eco', 'Super', 'Classic', 'Elite'])} ${fuelType}`,
      fuelBagging: randomChoice(fuelBaggingTypes),
      isBaggedAtSource: randomChoice(['Yes', 'No']),
      fuelDescription: `${randomChoice(['Pillow-shaped', 'Cylindrical', 'Oval', 'Brick-shaped', 'Irregular'])} ${fuelType.toLowerCase()} with ${randomChoice(['single', 'double', 'triple'])} line indentation`,
      fuelWeight: `Average weight of ${randomInt(100, 200)} to ${randomInt(201, 300)} grams per ${randomChoice(['briquette', 'piece', 'pellet', 'log'])}`,
      fuelComposition: `${randomChoice(['Anthracite', 'Wood', 'Biomass', 'Coal'])} fines (${randomInt(40, 90)}% to ${randomInt(91, 99)}%)`,
      sulphurContent: String(randomInt(1, 50)),
      manufacturingProcess: `${randomChoice(['Roll pressing', 'Compression', 'Heat treatment', 'Extrusion'])} at ${randomInt(200, 400)} degrees celsius`,
      isRebrandedProduct: randomChoice(['Yes', 'No']),
      hasChangedFromOriginal: randomChoice(['Yes', 'No']),
      brandNames: brandNames.join(', ')
    })
  }

  return fuels
}

function generateUsers(count) {
  const users = []
  const usedEmails = new Set()

  for (let i = 1; i <= count; i++) {
    const firstName = randomChoice(firstNames)
    const lastName = randomChoice(lastNames)
    let email = randomEmail(firstName, lastName)

    // Ensure unique emails
    while (usedEmails.has(email)) {
      email = randomEmail(firstName, `${lastName}${randomInt(1, 999)}`)
    }
    usedEmails.add(email)

    const city = randomChoice(cities)
    const postcode = randomPostcode()

    users.push({
      userId: `USER${String(i).padStart(3, '0')}`,
      firstName,
      lastName,
      email,
      phone: randomPhone(),
      role: randomChoice(userRoles),
      organization: randomChoice(organizations),
      address: `${randomInt(1, 999)} ${randomChoice(['High Street', 'Main Road', 'Park Lane', 'Oak Avenue', 'Queens Road'])} ${city}`,
      city,
      postcode,
      isActive: randomChoice(['Yes', 'No']),
      registrationDate: randomDate(new Date(2023, 0, 1), new Date(2025, 11, 31))
    })
  }

  return users
}

function saveToExcel(data, sheetName, filename) {
  const templatesDir = join(process.cwd(), 'templates')
  if (!existsSync(templatesDir)) {
    mkdirSync(templatesDir, { recursive: true })
  }

  const workbook = xlsx.utils.book_new()
  const sheet = xlsx.utils.json_to_sheet(data)

  // Auto-width columns
  const colCount = Object.keys(data[0]).length
  sheet['!cols'] = Array(colCount).fill({ wch: 20 })

  xlsx.utils.book_append_sheet(workbook, sheet, sheetName)

  const filePath = join(templatesDir, filename)
  xlsx.writeFile(workbook, filePath)

  return filePath
}

function generateDummyData() {
  console.log('🚀 Generating Excel files with 100 dummy entries each...\n')

  const templatesDir = join(process.cwd(), 'templates')
  if (!existsSync(templatesDir)) {
    mkdirSync(templatesDir, { recursive: true })
  }

  // Generate data
  console.log('📊 Generating 100 appliances...')
  const appliances = generateAppliances(100)

  console.log('📊 Generating 100 fuels...')
  const fuels = generateFuels(100)

  console.log('📊 Generating 100 users...')
  const users = generateUsers(100)

  // Save individual files
  console.log('\n💾 Saving individual files...')

  const appPath = saveToExcel(
    appliances,
    'Appliances',
    'appliances-template.xlsx'
  )
  console.log(`✅ Appliances: ${appPath}`)

  const fuelPath = saveToExcel(fuels, 'Fuels', 'fuels-template.xlsx')
  console.log(`✅ Fuels: ${fuelPath}`)

  const userPath = saveToExcel(users, 'Users', 'users-template.xlsx')
  console.log(`✅ Users: ${userPath}`)

  // Save combined file
  console.log('\n💾 Creating combined file...')
  const combinedWorkbook = xlsx.utils.book_new()

  const appSheet = xlsx.utils.json_to_sheet(appliances)
  appSheet['!cols'] = Array(Object.keys(appliances[0]).length).fill({ wch: 20 })
  xlsx.utils.book_append_sheet(combinedWorkbook, appSheet, 'Appliances')

  const fuelSheet = xlsx.utils.json_to_sheet(fuels)
  fuelSheet['!cols'] = Array(Object.keys(fuels[0]).length).fill({ wch: 20 })
  xlsx.utils.book_append_sheet(combinedWorkbook, fuelSheet, 'Fuels')

  const userSheet = xlsx.utils.json_to_sheet(users)
  userSheet['!cols'] = Array(Object.keys(users[0]).length).fill({ wch: 20 })
  xlsx.utils.book_append_sheet(combinedWorkbook, userSheet, 'Users')

  const combinedPath = join(templatesDir, 'combined-template.xlsx')
  xlsx.writeFile(combinedWorkbook, combinedPath)
  console.log(`✅ Combined: ${combinedPath}`)

  console.log('\n✨ All files generated successfully!')
  console.log('\n📋 Summary:')
  console.log(`  - 100 unique appliances`)
  console.log(`  - 100 unique fuels`)
  console.log(`  - 100 unique users`)
  console.log('\n🚀 You can now use these files for testing imports!')
}

generateDummyData()
