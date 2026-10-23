import { generateSecureId } from '../../common/helpers/data-transformer.js'
import { calculateItemStatus } from '../../common/helpers/item-status.js'
import { actionDescriptions } from '../../common/schemas/action-schema.js'

// Map of country codes to certification field names
const countryToCertificationField = {
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
const recordCertificationAction = async (
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

  // Re-read so the response includes the recalculated appliance status instead of
  // the stale pre-rollup snapshot returned by the update call.
  const latest =
    (await db.collection('Appliances').findOne({ id: applianceId })) ?? updated

  await recordCertificationAction(
    db,
    {
      applianceId,
      country,
      fromStatus: currentStatus,
      toStatus: newStatus,
      decidedBy,
      at: now
    },
    logger
  )

  logger.info(
    `Certification status updated: ${applianceId} (${country}: ${currentStatus} -> ${newStatus})`
  )

  return { success: true, data: latest }
}
