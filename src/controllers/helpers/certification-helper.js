import { calculateItemStatus } from '../../common/helpers/item-status.js'
import { COUNTRY_CERTIFICATION_FIELDS } from '../../common/helpers/certification.js'
import {
  recordAction,
  toUserActor
} from '../../common/helpers/action-history.js'

// HETAS decides on a government's behalf here, so the history says so.
// HERE: DA decisions (email link, not built yet) should record `certified` /
// `uncertified` with `actor: toGovernmentActor(country)` instead.
const statusToAction = {
  certified: 'certifiedOnBehalf',
  uncertified: 'uncertifiedOnBehalf'
}

export const requireArgs = (args) => {
  for (const [name, value] of Object.entries(args)) {
    if (!value) {
      throw new Error(`${name} is required`)
    }
  }
}

/**
 * Resolve the appliance and the country's current certification.
 * Returns `{ failure }` with a ready-made result when either cannot be found.
 */
export const loadDecisionTarget = async (db, applianceId, country, logger) => {
  const certificationField = COUNTRY_CERTIFICATION_FIELDS[country]

  if (!certificationField) {
    logger.warn(`Invalid country code: ${country}`)
    return {
      failure: {
        success: false,
        code: 'INVALID_COUNTRY',
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
        code: 'NOT_FOUND',
        error: `Appliance not found: ${applianceId}`
      }
    }
  }

  return {
    appliance,
    certificationField,
    ...readCertification(appliance, certificationField, logger)
  }
}

export const isValidStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = {
    awaiting_decision: ['certified', 'uncertified'],
    certified: ['uncertified'],
    uncertified: ['certified']
  }

  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false
}

// An appliance with no recorded certification is still awaiting a decision.
const readCertification = (appliance, certificationField, logger) => {
  const certification = appliance[certificationField] || {}
  const status = certification.status || 'awaiting_decision'

  if (!certification.status) {
    logger?.debug?.(
      `No ${certificationField} status found for ${appliance.id}; defaulting to awaiting_decision`
    )
  }

  return {
    certification,
    status
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
    return {
      success: false,
      code: 'UPDATE_FAILED',
      error: 'Failed to update appliance'
    }
  }

  await refreshApplianceStatus(db, applianceId, logger)

  // Re-read so the response includes the recalculated appliance status instead of
  // the stale pre-rollup snapshot returned by the update call.
  const latest =
    (await db.collection('Appliances').findOne({ id: applianceId })) ?? updated

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

  return { success: true, data: latest }
}
