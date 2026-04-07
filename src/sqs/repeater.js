export function splitRepeaterJson(input) {
  // const { createLogger } = require('../common/helpers/logging/logger.js')
  // const logger = createLogger()
  console.log(`input: ${JSON.stringify(input)}`)

  // logger.debug('Starting repeater JSON split process')
  const baseMain = input.main
  //logger.debug(`Base main fields: ${Object.keys(baseMain).join(', ')}`)
  console.log(`Base main ${JSON.stringify(baseMain)}`)

  const repeaters = input.repeaters?.LbZxXf || []
  // logger.info(`Found ${repeaters.length} repeater item(s)`)
  // logger.debug(`Repeater items: ${JSON.stringify(repeaters)}`)
  console.log(`Found ${repeaters.length} repeater item(s)`)
  console.log(`Repeaters items: ${JSON.stringify(repeaters)}`)

  if (!Array.isArray(repeaters) || repeaters.length === 0) {
    console.log('No repeater items found, returning empty array')
    return {} // or return [input] depending on your needs
  }

  const outputs = repeaters.map((repeaterItem, index) => {
    console.log(`Processing repeater item ${index + 1}/${repeaters.length}`)
    console.log(`Repeater item fields: ${Object.keys(repeaterItem).join(', ')}`)

    const merged = {
      ...baseMain, // copy all main fields
      ...repeaterItem // merge repeater fields into main
    }
    console.log(
      `Merged item ${index + 1} has ${Object.keys(merged).length} total fields`
    )
    return merged
  })

  console.log(
    `Repeater splitting completed: created ${outputs.length} output item(s)`
  )
  return outputs
}
