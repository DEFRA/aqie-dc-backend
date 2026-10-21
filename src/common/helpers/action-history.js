import { generateSecureId } from './data-transformer.js'
import { actionSchema, actionWording } from '../schemas/action-schema.js'

export const SYSTEM_ACTOR = Object.freeze({ name: 'System', type: 'system' })

// Country slug (as used in routes) to the name shown in action wording.
const COUNTRY_NAMES = {
  england: 'England',
  scotland: 'Scotland',
  wales: 'Wales',
  'northern-ireland': 'Northern Ireland'
}

/**
 * The signed-in user as an action's `completedBy`. Without a name there is no
 * one to attribute the action to, so it is recorded against the system.
 */
export const toUserActor = (user) => {
  if (!user?.name) {
    return SYSTEM_ACTOR
  }

  return {
    name: user.name,
    ...(user.email && { email: user.email }),
    type: 'user'
  }
}

/**
 * Append an entry to an item's action history. History must never fail the
 * change it describes, so any error (including an invalid entry) is logged
 * and swallowed.
 *
 * @param {import('mongodb').Db} db
 * @param {object} entry
 * @param {string} entry.itemId - applianceId or fuelId
 * @param {'appliance'|'fuel'} entry.itemType
 * @param {string} entry.action - a key of `actionWording`
 * @param {string} [entry.country] - country slug, for country-specific actions
 * @param {object} entry.actor - see `toUserActor` / `SYSTEM_ACTOR`
 * @param {Date} [entry.at] - defaults to now
 * @param {object} [entry.details] - extra fields, e.g. fromStatus/toStatus
 * @param {object} [logger]
 */
export const recordAction = async (
  db,
  { itemId, itemType, action, country, actor, at = new Date(), details = {} },
  logger
) => {
  try {
    const entry = {
      id: `ACT-${generateSecureId()}`,
      itemId,
      itemType,
      action,
      description: actionWording[action]?.(COUNTRY_NAMES[country]),
      ...(country && { country }),
      ...details,
      completedBy: actor,
      completedAt: at
    }

    const { error } = actionSchema.validate(entry)
    if (error) {
      throw error
    }

    await db.collection('Actions').insertOne(entry)
  } catch (error) {
    logger?.error(
      `Failed to record action ${action} for ${itemId}: ${error.message}`
    )
  }
}
