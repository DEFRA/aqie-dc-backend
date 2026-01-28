/**
 * Watch a directory for new Excel files and auto-import them
 *
 * Usage:
 * node src/migrations/watch-and-import.js --watch /path/to/dropbox/folder
 */

import { watch } from 'fs'
import { join } from 'path'
import { importFromExcel } from './import-from-excel.js'
import { MongoClient } from 'mongodb'
import { config } from '../config.js'

const WATCH_PATTERNS = /\.(xlsx|xls)$/i

async function processFile(filepath, db) {
  console.log(`\n📥 New file detected: ${filepath}`)

  try {
    // Determine type from filename
    let type = 'both'
    const filename = filepath.toLowerCase()

    if (filename.includes('appliance')) {
      type = 'appliances'
    } else if (filename.includes('fuel')) {
      type = 'fuels'
    }

    console.log(`   Type detected: ${type}`)

    // Import the file
    const results = await importFromExcel(db, filepath, type, { verbose: true })

    console.log('\n✅ Auto-import completed!')
    console.log('Results:', JSON.stringify(results, null, 2))

    // Optional: Move processed file to archive folder
    // await rename(filepath, join(dirname(filepath), 'processed', basename(filepath)))
  } catch (error) {
    console.error('\n❌ Auto-import failed:', error.message)
  }
}

async function watchDirectory(watchPath) {
  console.log(`👀 Watching directory: ${watchPath}`)
  console.log('   Waiting for new Excel files...\n')

  // Connect to database once
  const mongoUrl = config.get('mongo.uri')
  const databaseName = config.get('mongo.databaseName')
  const client = await MongoClient.connect(mongoUrl)
  const db = client.db(databaseName)

  console.log(`   Connected to database: ${databaseName}\n`)

  const processedFiles = new Set()

  watch(watchPath, { recursive: false }, async (eventType, filename) => {
    if (!filename || !WATCH_PATTERNS.test(filename)) {
      return
    }

    const filepath = join(watchPath, filename)

    // Avoid processing the same file multiple times
    if (processedFiles.has(filepath)) {
      return
    }

    processedFiles.add(filepath)

    // Wait a bit to ensure file is fully written
    setTimeout(async () => {
      await processFile(filepath, db)

      // Remove from processed set after some time
      setTimeout(() => processedFiles.delete(filepath), 60000)
    }, 1000)
  })

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down file watcher...')
    await client.close()
    process.exit(0)
  })
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const watchIndex = args.indexOf('--watch')

  if (watchIndex === -1 || !args[watchIndex + 1]) {
    console.error('❌ Missing --watch argument')
    console.log('\nUsage:')
    console.log(
      '  node src/migrations/watch-and-import.js --watch <directory-path>'
    )
    console.log('\nExample:')
    console.log(
      '  node src/migrations/watch-and-import.js --watch /Users/you/Dropbox/imports'
    )
    process.exit(1)
  }

  const watchPath = args[watchIndex + 1]
  watchDirectory(watchPath).catch(console.error)
}
