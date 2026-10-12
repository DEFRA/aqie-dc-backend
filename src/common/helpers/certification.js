// Country certification fields and helpers shared by appliances and fuels.
// Single source of truth so read paths can't drift on the set of countries.

const CERTIFICATION_REGIONS = {
  englandCertification: 'England',
  scotlandCertification: 'Scotland',
  walesCertification: 'Wales',
  nIrelandCertification: 'Northern Ireland'
}

export const CERTIFICATION_FIELDS = Object.keys(CERTIFICATION_REGIONS)

export const CERTIFIED_STATUS = 'certified'
// Statuses that count as "not certified" rather than "not yet decided":
export const UNCERTIFIED_STATUSES = new Set(['revoked', 'rejected'])

// For public frontend use: the regions where the item is certified.
export const findCertified = (item) =>
  CERTIFICATION_FIELDS.filter(
    (field) => item?.[field]?.status === CERTIFIED_STATUS
  ).map((field) => CERTIFICATION_REGIONS[field])

// The most recent lastCertifiedAt across the countries, or null if none are usable.
export const findLastCertifiedDate = (item) => {
  const dates = CERTIFICATION_FIELDS.map(
    (field) => item?.[field]?.lastCertifiedAt
  )
    .filter(
      (value) =>
        (typeof value === 'string' && value.trim() !== '') ||
        value instanceof Date
    )
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() !== 0)
    .sort((a, b) => b.getTime() - a.getTime())

  return dates.length > 0 ? dates[0].toISOString() : null
}
