// Utility functions for data transformation and ID generation
// Used by controllers for formatting data, generating IDs, and processing certifications

import crypto from 'node:crypto'

const SECURE_ID_LENGTH = 12
const RANDOM_BYTES_LENGTH = 9
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g
const PREFIX_LENGTH = 4
const SEQUENCE_MIN_LENGTH = 4

export const generateSecureId = () => {
  let id = ''
  while (id.length < SECURE_ID_LENGTH) {
    id += crypto
      .randomBytes(RANDOM_BYTES_LENGTH)
      .toString('base64')
      .replaceAll(NON_ALPHANUMERIC_REGEX, '')
  }
  return id.slice(0, SECURE_ID_LENGTH)
}

// Id format is "PPPP-SSSS": 4-digit random prefix, "-", then the sequence
export const generateNextId = (lastId) => {
  const lastSequence = lastId
    ? Number.parseInt(lastId.slice(PREFIX_LENGTH + 1), 10)
    : 0

  const prefix = String(crypto.randomInt(0, 10_000)).padStart(PREFIX_LENGTH, '0')
  const sequence = String(
    (Number.isNaN(lastSequence) ? 0 : lastSequence) + 1
  ).padStart(SEQUENCE_MIN_LENGTH, '0')

  return `${prefix}-${sequence}`
}

// Returns the full address array for an item, handling UK and non-UK logic
export const getFullAddress = (item) => {
  const filterLines = (...lines) =>
    lines.filter((line) => typeof line === 'string' && line.trim() !== '')
  return item.isUkBased === false
    ? filterLines(item.companyFullAddress)
    : filterLines(
        item.companyAddress.line1,
        item.companyAddress.line2,
        item.companyAddress.city,
        item.companyAddress.county,
        item.companyAddress.postcode
      )
}

/**
 * Flattens a nested object into MongoDB dot-notation paths, so an update
 * touches only the fields supplied.
 *
 * {technicalReview: {status:'accepted'}}
 * becomes{'technicalReview.status':'accepted'}
 *
 * Without this, $set replaces the whole technicalReview object and loses any
 * sibling fields it already held. Arrays and dates are treated as single
 * values; empty objects are dropped so they cannot overwrite existing data.
 */
export const toDotted = (source, prefix = '') =>
  Object.entries(source).reduce((paths, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const isNestedObject =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)

    return isNestedObject
      ? { ...paths, ...toDotted(value, path) }
      : { ...paths, [path]: value }
  }, {})
