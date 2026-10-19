import { calculateItemStatus } from '../../common/helpers/item-status.js'
import {
  recordAction,
  toUserActor
} from '../../common/helpers/action-history.js'

// Map of country codes to certification field names
const countryToCertificationField = {
  england: 'englandCertification',
  scotland: 'scotlandCertification',
  wales: 'walesCertification',
  'northern-ireland': 'nIrelandCertification'
}

// HETAS decides on a government's behalf here, so the history says so.
const statusToAction = {
  certified: 'certifiedOnBehalf',
  uncertified: 'uncertifiedOnBehalf'
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
const readCertification = (appliance, certificationField) => {
  const certification = appliance[certificationField] || {}
  return {
    certification,
    status: certification.status || 'awaiting_decision'
  }
}

// Replaces the whole object, so the milestones are carried forward explicitly.
const buildCertification = (current, newStatus, decidedBy, now) => {
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
const refreshApplianceStatus = async (db, applianceId, logger) => {
  try {
    await calculateItemStatus(db, 'appliance', applianceId, { logger })
  } catch (error) {
    logger.error(
      `Failed to recalculate applianceStatus for ${applianceId}: ${error.message}`
    )
  }
}

/**
 * Resolve the appliance and the country's current certification.
 * Returns `{ failure }` with a ready-made result when either cannot be found.
 */
export const loadDecisionTarget = async (db, applianceId, country, logger) => {
  const certificationField = countryToCertificationField[country]

  if (!certificationField) {
    logger.warn(`Invalid country code: ${country}`)
    return {
      failure: {
        success: false,
        error: `Invalid country: ${country}. Must be one of: england, scotland, wales, northern-ireland`
      }
    }
  }

  const appliance = await db
    .collection('Appliances')
    .findOne({ id: applianceId })

  if (!appliance) {
    logger.warn(`Appliance not found: ${applianceId}`)
    return {
      failure: {
        success: false,
        error: `Appliance not found: ${applianceId}`
      }
    }
  }

  return {
    appliance,
    certificationField,
    ...readCertification(appliance, certificationField)
  }
}

/**
 * Persist a validated decision, then refresh the overall appliance status and
 * append the audit entry.
 */
export const saveDecision = async (
  db,
  {
    applianceId,
    country,
    certificationField,
    currentCertification,
    currentStatus,
    newStatus,
    decidedBy
  },
  logger
) => {
  const now = new Date()
  const certification = buildCertification(
    currentCertification,
    newStatus,
    decidedBy,
    now
  )

  const updated = await db
    .collection('Appliances')
    .findOneAndUpdate(
      { id: applianceId },
      { $set: { [certificationField]: certification, updatedAt: now } },
      { returnDocument: 'after' }
    )

  if (!updated) {
    logger.error(`Failed to update appliance: ${applianceId}`)
    return { success: false, error: 'Failed to update appliance' }
  }

  await refreshApplianceStatus(db, applianceId, logger)

  await recordAction(
    db,
    {
      itemId: applianceId,
      itemType: 'appliance',
      action: statusToAction[newStatus],
      country,
      actor: toUserActor(decidedBy),
      at: now,
      details: { fromStatus: currentStatus, toStatus: newStatus }
    },
    logger
  )

  logger.info(
    `Certification status updated: ${applianceId} (${country}: ${currentStatus} -> ${newStatus})`
  )

  return { success: true, data: updated }
}
