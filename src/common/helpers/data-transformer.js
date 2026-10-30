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

  const prefix = String(crypto.randomInt(0, 10_000)).padStart(
    PREFIX_LENGTH,
    '0'
  )
  const sequence = String(
    (Number.isNaN(lastSequence) ? 0 : lastSequence) + 1
  ).padStart(SEQUENCE_MIN_LENGTH, '0')

  return `${prefix}-${sequence}`
}

// Returns the full address as an array of strings containing only non-empty address lines (UK and non-UK)
// Examples:
//   UK:       { companyAddress: { line1: '1 High St', line2: '', city: 'Leeds', county: null, postcode: 'LS1 1AA', country: 'England' } }
//             -> ['1 High St', 'Leeds', 'LS1 1AA', 'England']
//   Overseas: { companyFullAddress: '456 Rue de Paris\n Paris \n\nFrance' }
//             -> ['456 Rue de Paris', 'Paris', 'France']
//   Overseas (single line): { companyFullAddress: '456 Rue de Paris, Paris, France' }
//             -> ['456 Rue de Paris,', 'Paris,', 'France']
//   Overseas (no commas or newlines): { companyFullAddress: '456 Rue de Paris' }
//             -> ['456 Rue de Paris']
export const getFullAddress = (item) => {
  const address = item?.companyAddress
  const lines =
    typeof item?.companyFullAddress === 'string' && item.companyFullAddress
      ? item.companyFullAddress.replaceAll(',', ',\n').split('\n')
      : [
          address?.line1,
          address?.line2,
          address?.city,
          address?.county,
          address?.postcode,
          address?.country
        ]
  return lines
    .filter((line) => typeof line === 'string')
    .map((line) => line.trim())
    .filter(Boolean)
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
