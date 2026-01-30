/**
 * Generate Excel files with relationship data (many-to-many)
 * Creates UserAppliances and UserFuels junction tables
 *
 * Usage:
 * node src/migrations/generate-relationship-data.js
 */

import xlsx from 'xlsx'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const templatesDir = join(process.cwd(), 'templates')

// Ensure templates directory exists
if (!existsSync(templatesDir)) {
  mkdirSync(templatesDir, { recursive: true })
}

/**
 * Generate UserAppliances relationships
 * Creates many-to-many relationships between users and appliances
 */
function generateUserAppliances(userCount = 100, applianceCount = 100) {
  const relationships = []
  const statuses = ['active', 'inactive', 'pending', 'expired']

  // Generate random relationships
  // Each user gets 1-5 appliances
  for (let u = 1; u <= userCount; u++) {
    const numAppliances = Math.floor(Math.random() * 5) + 1
    const assignedAppliances = new Set()

    for (let i = 0; i < numAppliances; i++) {
      const applianceNum = Math.floor(Math.random() * applianceCount) + 1
      const applianceId = `APP${String(applianceNum).padStart(3, '0')}`

      // Avoid duplicates for same user
      if (!assignedAppliances.has(applianceId)) {
        assignedAppliances.add(applianceId)

        // Random date in last 2 years
        const daysAgo = Math.floor(Math.random() * 730)
        const assignedDate = new Date()
        assignedDate.setDate(assignedDate.getDate() - daysAgo)

        relationships.push({
          'User ID': `USER${String(u).padStart(3, '0')}`,
          'Appliance ID': applianceId,
          'Assigned Date': assignedDate.toLocaleDateString('en-GB'),
          Status: statuses[Math.floor(Math.random() * statuses.length)],
          Notes: Math.random() > 0.7 ? getNotes('appliance') : ''
        })
      }
    }
  }

  return relationships
}

/**
 * Generate UserFuels relationships
 * Creates many-to-many relationships between users and fuels
 */
function generateUserFuels(userCount = 100, fuelCount = 100) {
  const relationships = []
  const statuses = ['active', 'inactive', 'pending', 'expired']

  // Generate random relationships
  // Each user gets 1-4 fuels
  for (let u = 1; u <= userCount; u++) {
    const numFuels = Math.floor(Math.random() * 4) + 1
    const assignedFuels = new Set()

    for (let i = 0; i < numFuels; i++) {
      const fuelNum = Math.floor(Math.random() * fuelCount) + 1
      const fuelId = `FUEL${String(fuelNum).padStart(3, '0')}`

      // Avoid duplicates for same user
      if (!assignedFuels.has(fuelId)) {
        assignedFuels.add(fuelId)

        // Random date in last 2 years
        const daysAgo = Math.floor(Math.random() * 730)
        const assignedDate = new Date()
        assignedDate.setDate(assignedDate.getDate() - daysAgo)

        relationships.push({
          'User ID': `USER${String(u).padStart(3, '0')}`,
          'Fuel ID': fuelId,
          'Assigned Date': assignedDate.toLocaleDateString('en-GB'),
          Status: statuses[Math.floor(Math.random() * statuses.length)],
          Notes: Math.random() > 0.7 ? getNotes('fuel') : ''
        })
      }
    }
  }

  return relationships
}

/**
 * Get random notes
 */
function getNotes(type) {
  const applianceNotes = [
    'Primary heating system',
    'Backup stove',
    'Recently installed',
    'Requires maintenance',
    'High efficiency model',
    'Used seasonally'
  ]

  const fuelNotes = [
    'Preferred fuel type',
    'Secondary option',
    'Bulk purchase',
    'Trial period',
    'Recommended by manufacturer',
    'Cost-effective choice'
  ]

  const notes = type === 'appliance' ? applianceNotes : fuelNotes
  return notes[Math.floor(Math.random() * notes.length)]
}

/**
 * Save data to Excel file
 */
function saveToExcel(data, filename, sheetName) {
  const worksheet = xlsx.utils.json_to_sheet(data)
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName)

  const filePath = join(templatesDir, filename)
  xlsx.writeFile(workbook, filePath)

  console.log(`✅ Created: ${filename} (${data.length} relationships)`)
}

/**
 * Create combined template with all relationships
 */
function createCombinedRelationshipTemplate(userAppliances, userFuels) {
  const workbook = xlsx.utils.book_new()

  // Add UserAppliances sheet
  const userAppliancesSheet = xlsx.utils.json_to_sheet(userAppliances)
  xlsx.utils.book_append_sheet(workbook, userAppliancesSheet, 'UserAppliances')

  // Add UserFuels sheet
  const userFuelsSheet = xlsx.utils.json_to_sheet(userFuels)
  xlsx.utils.book_append_sheet(workbook, userFuelsSheet, 'UserFuels')

  const filePath = join(templatesDir, 'relationships-template.xlsx')
  xlsx.writeFile(workbook, filePath)

  console.log(
    `✅ Created: relationships-template.xlsx (${userAppliances.length + userFuels.length} total relationships)`
  )
}

/**
 * Main execution
 */
async function main() {
  console.log('🔗 Generating relationship data...\n')

  // Generate relationships
  const userAppliances = generateUserAppliances(100, 100)
  const userFuels = generateUserFuels(100, 100)

  // Save individual templates
  saveToExcel(userAppliances, 'user-appliances-template.xlsx', 'UserAppliances')
  saveToExcel(userFuels, 'user-fuels-template.xlsx', 'UserFuels')

  // Save combined template
  createCombinedRelationshipTemplate(userAppliances, userFuels)

  console.log('\n✨ All relationship templates generated successfully!')
  console.log(`📁 Templates saved in: ${templatesDir}`)
}

main().catch(console.error)
