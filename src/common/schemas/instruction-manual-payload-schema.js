import Joi from 'joi'

/**
 * Instruction manual payload for the technical review "instructionManual" check.
 *
 * Two schemas because the acceptance criteria only require the manual details
 * when the check is marked as passed. A failed check may be saved with whatever
 * the reviewer had typed so far, including nothing at all.
 */

const MAX_TITLE_LENGTH = 200
const MAX_VERSION_LENGTH = 100
const MIN_YEAR = 1900
const MAX_YEAR = 9999

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Rejects well-formed but non-existent dates such as 2024-02-31, which
 * `new Date()` would silently roll forward to 2024-03-02.
 */
const isRealCalendarDate = (value) => {
  const [year, month, day] = value.split('-').map(Number)

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return false
  }

  const parsed = new Date(Date.UTC(year, month - 1, day))

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

const calendarDate = (schema) =>
  schema.pattern(ISO_DATE_PATTERN).custom((value, helpers) => {
    if (!isRealCalendarDate(value)) {
      return helpers.error('date.invalid')
    }
    return value
  }, 'real calendar date')

export const passedInstructionManualSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(MAX_TITLE_LENGTH)
    .required()
    .description('Instruction manual title'),

  version: Joi.string()
    .trim()
    .max(MAX_VERSION_LENGTH)
    .allow('', null)
    .required()
    .description('Instruction manual version'),

  publicationDate: calendarDate(Joi.string().trim())
    .required()
    .description('Publication date as YYYY-MM-DD')
}).unknown(false)

export const failedInstructionManualSchema = Joi.object({
  title: Joi.string()
    .trim()
    .max(MAX_TITLE_LENGTH)
    .allow('', null)
    .default(null),

  version: Joi.string()
    .trim()
    .max(MAX_VERSION_LENGTH)
    .allow('', null)
    .default(null),

  publicationDate: calendarDate(Joi.string().trim())
    .allow('', null)
    .default(null)
}).unknown(false)
