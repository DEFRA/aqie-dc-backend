// Utility functions for data transformation and ID generation
// Used by controllers for formatting data, generating IDs, and processing certifications

import crypto from 'node:crypto'

const SECURE_ID_LENGTH = 12
const RANDOM_BYTES_LENGTH = 9
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g

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

export const findCertified = (
  englandCertification,
  scotlandCertification,
  walesCertification,
  nIrelandCertification
) => {
  const approvedRegions = []

  if (englandCertification?.status === 'certified') {
    approvedRegions.push('England')
  }
  if (scotlandCertification?.status === 'certified') {
    approvedRegions.push('Scotland')
  }
  if (walesCertification?.status === 'certified') {
    approvedRegions.push('Wales')
  }
  if (nIrelandCertification?.status === 'certified') {
    approvedRegions.push('Northern Ireland')
  }

  return approvedRegions
}

// Finds the most recent updatedDate from the provided country date strings
export const findLastUpdatedDate = (
  englandDate,
  scotlandDate,
  walesDate,
  nIrelandDate
) => {
  const validDates = [englandDate, scotlandDate, walesDate, nIrelandDate]
    .filter(
      (dateString) =>
        (typeof dateString === 'string' && dateString.trim() !== '') ||
        dateString instanceof Date
    )
    .map((dateString) => new Date(dateString))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() !== 0)
    .sort((a, b) => b.getTime() - a.getTime())

  return validDates.length > 0 ? validDates[0].toISOString() : null
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
 *   { technicalReview: { status: 'accepted' } }
 *     becomes { 'technicalReview.status': 'accepted' }
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
