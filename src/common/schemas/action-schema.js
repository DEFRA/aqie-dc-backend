import Joi from 'joi'

// ============================================================================
// ACTION SCHEMA for audit log
// ============================================================================
export const actionDescriptions = {
  englandCertified: 'Certified in England',
  englandUncertified: 'Uncertified in England',
  englandAwaitingDecision: 'Awaiting decision in England',

  scotlandCertified: 'Certified in Scotland',
  scotlandUncertified: 'Uncertified in Scotland',
  scotlandAwaitingDecision: 'Awaiting decision in Scotland',

  walesCertified: 'Certified in Wales',
  walesUncertified: 'Uncertified in Wales',
  walesAwaitingDecision: 'Awaiting decision in Wales',

  nIrelandCertified: 'Certified in Northern Ireland',
  nIrelandUncertified: 'Uncertified in Northern Ireland',
  nIrelandAwaitingDecision: 'Awaiting decision in Northern Ireland',

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
  description: Joi.string()
    .optional()
    .description('Human-readable description of the action'),
  country: Joi.string()
    .valid('england', 'scotland', 'wales', 'northern-ireland')
    .optional()
    .description('Country the certification decision applies to'),
  fromStatus: Joi.string().optional().description('Status before the change'),
  toStatus: Joi.string().optional().description('Status after the change'),
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
