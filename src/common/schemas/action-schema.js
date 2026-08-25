import Joi from 'joi'

// ============================================================================
// ACTION SCHEMA for audit log
// ============================================================================
//need clarify:
export const actionDescriptions = {
  englandCertified: 'England status changed to certified',
  englandRevoked: 'England status changed to revoked',
  englandRejected: 'England status changed to rejected',

  scotlandCertified: 'Scotland status changed to certified',
  scotlandRevoked: 'Scotland status changed to revoked',
  scotlandRejected: 'Scotland status changed to rejected',

  walesCertified: 'Wales status changed to certified',
  walesRevoked: 'Wales status changed to revoked',
  walesRejected: 'Wales status changed to rejected',

  nIrelandCertified: 'Northern Ireland status changed to certified',
  nIrelandRevoked: 'Northern Ireland status changed to revoked',
  nIrelandRejected: 'Northern Ireland status changed to rejected',

  technicalReviewStarted: 'Technical review started',
  technicalReviewAccepted: 'Technical review accepted',
  technicalReviewRejected: 'Technical review rejected',

  applianceCreated: 'Appliance created',
  applianceUpdated: 'Appliance updated',
  appliancePublished: 'Appliance published'
}

export const actionSchema = Joi.object({
  id: Joi.string().required().description('Primary key'),
  itemId: Joi.string().required().description('Foreign key to item'),
  type: Joi.string().required().description('Check type'),
  action: Joi.string()
    .valid(...Object.keys(actionDescriptions))
    .required(),
  completedBy: Joi.object({
    name: Joi.string()
      .required()
      .description('Name of person completing the check'),
    email: Joi.string()
      .email()
      .required()
      .description('Email of person completing the check')
  })
    .allow(null)
    .optional(),
  completedAt: Joi.date()
    .iso()
    .allow(null)
    .default(null)
    .description('Date and time the check was completed')
})
  .unknown(false)
  .label('Action')
