export function splitRepeaterJson(input) {
  const { createLogger } = require('../common/helpers/logging/logger.js')
  const logger = createLogger()

  logger.debug('Starting repeater JSON split process')
  const baseMain = input.data.main
  logger.debug(`Base main fields: ${Object.keys(baseMain).join(', ')}`)

  const repeaters = input.data.repeaters?.LbZxXf || []
  logger.info(`Found ${repeaters.length} repeater item(s)`)
  logger.debug(`Repeater items: ${JSON.stringify(repeaters)}`)

  if (!Array.isArray(repeaters) || repeaters.length === 0) {
    logger.warn('No repeater items found, returning empty array')
    return {} // or return [input] depending on your needs
  }

  const outputs = repeaters.map((repeaterItem, index) => {
    logger.debug(`Processing repeater item ${index + 1}/${repeaters.length}`)
    logger.debug(
      `Repeater item fields: ${Object.keys(repeaterItem).join(', ')}`
    )

    const merged = {
      ...baseMain, // copy all main fields
      ...repeaterItem // merge repeater fields into main
    }
    logger.debug(
      `Merged item ${index + 1} has ${Object.keys(merged).length} total fields`
    )
    return merged
  })

  logger.info(
    `Repeater splitting completed: created ${outputs.length} output item(s)`
  )
  return outputs
}
