/**
 * CLI wrapper around the shared Excel importer.
 * Field mapping lives in src/common/helpers/entity-config.js.
 *
 * Usage:
 * node src/migrations/import-cli.js --file path/to/file.xlsx --type <appliances|fuels|both>
 */

import { MongoClient } from 'mongodb'
import { config } from '../config.js'
import { importFromExcel } from './import-from-excel-dynamic.js'
import { ENTITY_TYPES } from '../common/helpers/entity-config.js'

const args = process.argv.slice(2)
const fileIndex = args.indexOf('--file')
const typeIndex = args.indexOf('--type')
const verbose = args.includes('--verbose') || args.includes('-v')

if (fileIndex === -1 || !args[fileIndex + 1]) {
  console.error(
    'Usage: node src/migrations/import-cli.js --file <path> --type <appliances|fuels|both> [-v]'
  )
  process.exit(1)
}

const filePath = args[fileIndex + 1]
const type =
  typeIndex !== -1 && args[typeIndex + 1] ? args[typeIndex + 1] : 'both'

const types = type === 'both' ? Object.values(ENTITY_TYPES) : [type]
const entities = types.map((t) => ({ type: t }))

const client = await MongoClient.connect(config.get('mongo.uri'))

try {
  const results = await importFromExcel(
    client.db(config.get('mongo.databaseName')),
    filePath,
    entities,
    { verbose }
  )
  console.log(JSON.stringify(results, null, 2))
} finally {
  await client.close()
}
