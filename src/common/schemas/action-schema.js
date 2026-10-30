import Joi from 'joi'

// ============================================================================
// ACTION SCHEMA for audit log
// ============================================================================

export const ACTOR_TYPES = ['user', 'system', 'government']

export const ITEM_TYPES = ['appliance', 'fuel']

// Wording of each action in an item's history. `place` is the country display
// name where the action applies, e.g. "Northern Ireland".
export const actionWording = {
  acceptedAtApplication: () => 'Accepted at application',
  rejectedAtApplication: () => 'Rejected at application',
  // History entry only: the notification email to the governments is not built yet.
  sentToGovernments: () => 'Sent to governments for approval',
  certified: (place) => `Certified in ${place}`,
  uncertified: (place) => `Uncertified in ${place}`,
  certifiedOnBehalf: (place) => `Certified on behalf of ${place}`,
  uncertifiedOnBehalf: (place) => `Uncertified on behalf of ${place}`,
  certificationSuspended: (place) => `Certification suspended for ${place}`,
  liveOnPublicList: () => 'Live on public list',
  hiddenFromPublicList: () => 'Hidden from public list',
  retestPassed: () => 'Retest passed',
  retestFailed: () => 'Retest failed'
}

// Actions worded with a country, so they cannot be recorded without one.
export const COUNTRY_ACTIONS = [
  'certified',
  'uncertified',
  'certifiedOnBehalf',
  'uncertifiedOnBehalf',
  'certificationSuspended'
]

export const actionSchema = Joi.object({
  id: Joi.string().required().description('Primary key'),
  itemId: Joi.string().required().description('Foreign key to the item'),
  itemType: Joi.string()
    .valid(...ITEM_TYPES)
    .required()
    .description('Whether the item is an appliance or a fuel'),
  action: Joi.string()
    .valid(...Object.keys(actionWording))
    .required(),
  description: Joi.string()
    .required()
    .description('Human-readable description shown in the action history'),
  country: Joi.string()
    .valid('england', 'scotland', 'wales', 'northern-ireland')
    .when('action', {
      is: Joi.valid(...COUNTRY_ACTIONS),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Country the action applies to'),
  fromStatus: Joi.string().optional().description('Status before the change'),
  toStatus: Joi.string().optional().description('Status after the change'),
  completedBy: Joi.object({
    name: Joi.string()
      .required()
      .description('Who completed it: a person, "System" or a government'),
    type: Joi.string()
      .valid(...ACTOR_TYPES)
      .required(),
    email: Joi.string().email().optional()
  }).required(),
  completedAt: Joi.date()
    .required()
    .description('Date and time the action was completed')
})
  .unknown(false)
  .label('Action')
