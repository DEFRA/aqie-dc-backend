// Country certification fields and helpers shared by appliances and fuels.
// Single source of truth so read paths can't drift on the set of countries.

const CERTIFICATION_REGIONS = {
  englandCertification: 'England',
  scotlandCertification: 'Scotland',
  walesCertification: 'Wales',
  nIrelandCertification: 'Northern Ireland'
}

export const CERTIFICATION_FIELDS = Object.keys(CERTIFICATION_REGIONS)

export const CERTIFICATION_COUNTRIES = {
  england: 'englandCertification',
  scotland: 'scotlandCertification',
  wales: 'walesCertification',
  northernIreland: 'nIrelandCertification'
}

export const CERTIFIED_STATUS = 'certified'
// Statuses that count as "not certified" rather than "not yet decided":
export const UNCERTIFIED_STATUSES = 'uncertified'
// Country certification statuses that are still awaiting a decision.
export const UNDECIDED_CERTIFICATION_STATUSES = new Set([
  'new',
  'awaiting_decision'
])

// For public frontend use: the regions where the item is certified.
export const findCertified = (item) =>
  CERTIFICATION_FIELDS.filter(
    (field) => item?.[field]?.status === CERTIFIED_STATUS
  ).map((field) => CERTIFICATION_REGIONS[field])

// The API contract never exposes 'new'; it is reported as awaiting_decision.
const EMPTY_CERTIFICATION = {
  status: 'awaiting_decision',
  firstCertifiedAt: null,
  lastCertifiedAt: null
}

export const mapCountryCertification = (certification) => {
  if (!certification) {
    return { ...EMPTY_CERTIFICATION }
  }

  return {
    status:
      !certification.status || certification.status === 'new'
        ? EMPTY_CERTIFICATION.status
        : certification.status,
    firstCertifiedAt: certification.firstCertifiedAt ?? null,
    lastCertifiedAt: certification.lastCertifiedAt ?? null
  }
}

// Per-country certification keyed by country (england, scotland, ...).
export const mapCertifications = (item) =>
  Object.fromEntries(
    Object.entries(CERTIFICATION_COUNTRIES).map(([country, field]) => [
      country,
      mapCountryCertification(item?.[field])
    ])
  )

// Countries whose stored status is missing or still 'new'.
export const findNotYetNotifiedCountries = (item) =>
  Object.entries(CERTIFICATION_COUNTRIES)
    .filter(([, field]) => {
      const status = item?.[field]?.status
      return !status || status === 'new'
    })
    .map(([country]) => country)

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
