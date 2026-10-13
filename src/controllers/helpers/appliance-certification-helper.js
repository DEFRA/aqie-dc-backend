import { generateSecureId } from '../../common/helpers/data-transformer.js'
import { calculateItemStatus } from '../../common/helpers/item-status.js'
import { actionDescriptions } from '../../common/schemas/action-schema.js'

// Map of country codes to certification field names
export const countryToCertificationField = {
  england: 'englandCertification',
  scotland: 'scotlandCertification',
  wales: 'walesCertification',
  'northern-ireland': 'nIrelandCertification'
}

// Prefix used when building audit action keys, e.g. `nIrelandCertified`
const countryToActionPrefix = {
  england: 'england',
  scotland: 'scotland',
  wales: 'wales',
  'northern-ireland': 'nIreland'
}

const statusToActionSuffix = {
  certified: 'Certified',
  uncertified: 'Uncertified',
  awaiting_decision: 'AwaitingDecision'
}

const allowedTransitions = {
  awaiting_decision: ['certified', 'uncertified'],
  certified: ['uncertified'],
  uncertified: ['certified']
}

export const isValidStatusTransition = (currentStatus, newStatus) =>
  allowedTransitions[currentStatus]?.includes(newStatus) ?? false

export const requireArgs = (args) => {
  for (const [name, value] of Object.entries(args)) {
    if (!value) {
      throw new Error(`${name} is required`)
    }
  }
}

// An appliance with no recorded certification is still awaiting a decision.
export const readCertification = (appliance, certificationField) => {
  const certification = appliance[certificationField] || {}
  return {
    certification,
    status: certification.status || 'awaiting_decision'
  }
}

// Replaces the whole object, so the milestones are carried forward explicitly.
export const buildCertification = (current, newStatus, decidedBy, now) => {
  const isCertified = newStatus === 'certified'
  const lastCertifiedAt = current.lastCertifiedAt ?? null
  const firstCertifiedAt = current.firstCertifiedAt ?? null

  return {
    status: newStatus,
    decidedAt: now,
    decidedBy,
    firstCertifiedAt: isCertified
      ? (firstCertifiedAt ?? now)
      : firstCertifiedAt,
    lastCertifiedAt: isCertified ? now : lastCertifiedAt
  }
}

// The decision is already saved, so a failed rollup is logged, not surfaced.
export const refreshApplianceStatus = async (db, applianceId, logger) => {
  try {
    await calculateItemStatus(db, 'appliance', applianceId)
  } catch (error) {
    logger.error(
      `Failed to recalculate applianceStatus for ${applianceId}: ${error.message}`
    )
  }
}

/**
 * Append an audit entry. Failure to record history must not fail the decision
 * itself, so errors are logged and swallowed.
 */
export const recordCertificationAction = async (
  db,
  { applianceId, country, fromStatus, toStatus, decidedBy, at },
  logger
) => {
  const action = `${countryToActionPrefix[country]}${statusToActionSuffix[toStatus]}`

  try {
    await db.collection('Actions').insertOne({
      id: `ACT-${generateSecureId()}`,
      itemId: applianceId,
      type: 'certification',
      action,
      description: actionDescriptions[action],
      country,
      fromStatus,
      toStatus,
      completedBy: decidedBy,
      completedAt: at
    })
  } catch (error) {
    logger.error(
      `Failed to record certification action for ${applianceId}: ${error.message}`
    )
  }
}
