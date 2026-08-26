import Joi from 'joi'
import { applianceSchema } from './item-schema.js'

// ============================================================================
// APPLICATION SCHEMA
// ============================================================================
export const applicationsSchema = Joi.object({
  type: Joi.string()
    .valid('appliance', 'fuel')
    .required()
    .description('Type of application'),
  id: Joi.string()
    .optional()
    .description('Unique application identifier (server-generated)'),
  submittedAt: Joi.date()
    .optional()
    .description(
      'When the application was submitted by a company, date comes from Defra forms'
    ),
  createdAt: Joi.date()
    .optional()
    .description(
      'When the application was created in our system (server-generated)'
    ),
  referenceNumber: Joi.string()
    .optional()
    .description(
      'Reference number from Defra forms, keep record of it incase any issues with the forms'
    ),
  //Are the above both needed - check defra forms payload
  status: Joi.string()
    .valid('new', 'in_progress', 'complete')
    .optional()
    .default('new')
    .description(
      'Application status (server-generated, defaults to "new". Complete when all items (appliances/fuels) have been reviewed (approved/rejected) and the application is submitted)'
    ),
  appliances: Joi.array().items(applianceSchema).optional(), //needs to be changed to items: Joi.array().items(itemSchema).optional() when do fuels applications
  //later in the application flow:
  reviewedBy: Joi.object({
    name: Joi.string().optional().description('Name of the reviewer'),
    email: Joi.string().optional().description('Email of the reviewer')
  })
    .optional()
    .allow(null)
    .description(
      'Assigned to this application, will be null first then comes from SSO'
    ),
  reviewedAt: Joi.date()
    .optional()
    .description('Date application was reviewed'),
  //
  updatedAt: Joi.date()
    .optional()
    .description(
      'When the application was last updated in our system (server-generated), best practice to use this field when anything is updated in the application'
    )
})
  .unknown(false)
  .label('Application')
