// Utility functions for db-service.js
import crypto from 'crypto'

export const generateSecureId = () => {
  return crypto
    .randomBytes(9)
    .toString('base64') // 12 chars but includes +=/
    .replace(/[^a-zA-Z0-9]/g, '') // remove symbols
    .slice(0, 12)
}

export const findCertified = (
  englandApproval,
  scotlandApproval,
  walesApproval,
  nIrelandApproval
) => {
  const approvedRegions = []

  if (englandApproval === 'Certified') {
    approvedRegions.push('England')
  }
  if (scotlandApproval === 'Certified') {
    approvedRegions.push('Scotland')
  }
  if (walesApproval === 'Certified') {
    approvedRegions.push('Wales')
  }
  if (nIrelandApproval === 'Certified') {
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
    ? filterLines(item.companyAddress)
    : filterLines(
        item.companyAddressLine1,
        item.companyAddressLine2,
        item.companyAddressCity,
        item.companyAddressCounty,
        item.companyAddressPostcode
      )
}
