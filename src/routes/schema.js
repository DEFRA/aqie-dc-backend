import Joi from 'joi'

const countryCertificationSchema = Joi.object({
  // 1. Current State Metadata
  status: Joi.string()
    .valid(
      'new', // Appliance/Item in technical review, hasn't been sent to country
      'awaiting_decision',
      'certified',
      'revoked', // Previously certified, now uncertified
      'rejected' // Denied initial certification
    )
    .default('new'),
  decidedAt: Joi.date()
    .iso()
    .default(() => new Date()),
  decidedBy: Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional()
  })
    .allow(null)
    .default(null),
  // 2. Historical Milestones
  firstCertifiedAt: Joi.date().iso().allow(null).default(null),
  lastCertifiedAt: Joi.date().iso().allow(null).default(null)
}).default()

// ============================================================================
// APPLIANCE SCHEMA
// ============================================================================
export const applianceSchema = Joi.object({
  // Fields from DXT form input
  applicationId: Joi.string()
    .optional()
    .description('Application ID (foreign key)'),
  // Start of appliance application fields
  companyName: Joi.string().required().description('Company name'),
  isUkBased: Joi.boolean().required().description('Is the company UK based?'),
  companyFullAddress: Joi.string()
    .when('isUkBased', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company address for overseas/non-UK-based companies'),
  companyAddress: Joi.object({
    uprn: Joi.string()
      .optional()
      .description('Company address UPRN (Unique Property Reference Number)'),
    line1: Joi.string().required().description('Company address line 1'),
    line2: Joi.string().optional().description('Company address line 2'),
    city: Joi.string().required().description('Company city'),
    county: Joi.string().optional().description('Company county'),
    postcode: Joi.string().required().description('Company postcode')
  }).when('isUkBased', {
    is: true,
    then: Joi.object().required(),
    otherwise: Joi.object().optional()
  }),
  companyContact: Joi.object({
    name: Joi.string().required().description('Company contact name'),
    email: Joi.string().required().description('Company contact email'),
    alternativeEmail: Joi.string()
      .optional()
      .allow(null)
      .empty(null) // allow null to be treated as missing i.e optional
      .description('Company alternative contact email'),
    phone: Joi.string()
      .trim()
      .optional()
      .allow(null)
      .empty(null)
      .pattern(/^(0\d{10}|\+\d{11,13})$/)
      .description(
        'Company contact phone number. Accepts local UK numbers (e.g. 07582812432) and international numbers with an optional leading + (e.g. +445398914260).'
      )
  }),
  modelName: Joi.string().required().description('Model name'),
  modelNumber: Joi.string().optional().description('Model number'),
  applianceType: Joi.string()
    .required()
    .description('Appliance type e.g. "heat"'),
  isVariant: Joi.boolean().required().description('Variant of appliance'),
  existingAuthorisedAppliance: Joi.string()
    .optional()
    .description('If it is a variant, details'),
  nominalOutput: Joi.number().required().description('Thermal output (kW)'),
  multifuelAppliance: Joi.boolean()
    .required()
    .description('Multifuel capability'),
  allowedFuels: Joi.string()
    .trim()
    .min(1)
    .required()
    .description('The fuels the appliance will be certified to burn'),
  declaration: Joi.boolean().required().description('Declaration'),
  // Fields from admin FE input
  ratedOutput: Joi.number().optional().description('Rated Output'),
  testedOutput: Joi.object({
    rated: Joi.number().optional().description('Tested Output - rated'),
    low: Joi.number().optional().description('Tested Output - low')
  }).optional(),
  smokeEmissionOutput: Joi.object({
    rated: Joi.number().optional().description('Smoke emission output - rated'),
    low: Joi.number().optional().description('Smoke emission output - low')
  }).optional(),
  airControlModifications: Joi.string()
    .optional()
    .description('Air control modifications'),
  instructionManual: Joi.object({
    title: Joi.string().optional().description('Instruction manual title'),
    date: Joi.date().optional().description('Instruction manual date'),
    version: Joi.string().optional().description('Instruction manual version'),
    additionalInfo: Joi.string()
      .optional()
      .description('Instruction manual additional information')
  }).optional(),
  //Legacy record fields (additional fields from DB migration that no longer exist in the new admin system)
  servicingManual: Joi.object({
    title: Joi.string().optional().description('Servicing manual title'),
    date: Joi.date().optional().description('Servicing manual date'),
    version: Joi.string().optional().description('Servicing manual version'),
    additionalInfo: Joi.string()
      .optional()
      .description('Servicing manual additional information')
  }).optional(),
  legacyRecord: Joi.boolean()
    .default(false)
    .description(
      'Records that have been migrated to the DB are deemed as legacy records'
    ),
  legacy: Joi.object({
    comments: Joi.string().optional().description('Legacy comments'),
    applianceId: Joi.string().optional().description('Legacy appliance ID'),
    applicationId: Joi.string().optional().description('Legacy application ID'),
    linkedApplications: Joi.string()
      .optional()
      .description('Legacy linked applications')
  }).optional(),
  //Reviews/Certifications
  technicalReview: Joi.object({
    status: Joi.string()
      .allow('', null)
      .empty(['', null])
      .default('new')
      .valid('new', 'in_review', 'accepted', 'rejected')
      .optional(), //needs to be an optional field to allow it to be omitted and default to pending
    reviewer: Joi.object({
      name: Joi.string()
        .optional()
        .description('Name of the technical reviewer'),
      email: Joi.string()
        .optional()
        .description('Email of the technical reviewer')
    }),
    updatedAt: Joi.date()
      .optional()
      .description('Date technical review status changed'),
    documentationReviewed: Joi.object({
      testReports: Joi.boolean().default(false),
      technicalDrawings: Joi.boolean().default(false),
      conformityMark: Joi.boolean().default(false),
      instructionManual: Joi.boolean().default(false)
    }),
    checksCompleted: Joi.object({
      applianceDetails: Joi.boolean().default(false),
      permittedFuels: Joi.boolean().default(false),
      additionalConditions: Joi.boolean().default(false)
    })
  })
    .default(() => ({ status: 'new' }))
    .description(
      'This technical review happens during the application stage, compromises of several checks including test reports, comformity mark etc.'
    ),
  englandCertification: countryCertificationSchema.description(
    'England certification status'
  ),
  scotlandCertification: countryCertificationSchema.description(
    'Scotland certification status'
  ),
  walesCertification: countryCertificationSchema.description(
    'Wales certification status'
  ),
  nIrelandCertification: countryCertificationSchema.description(
    'Northern Ireland certification status'
  ),
  // Fields for frontends
  isVisible: Joi.boolean()
    .default(true)
    .description('Should this appliance be visible to the public?'),
  // todo: need to put logic in to populate these fields
  publishedDate: Joi.date()
    .optional()
    .description('The earliest date of certification'),
  applianceStatus: Joi.string().description(
    'Takes in account the technical review and country certifications, and isVisible to determine the overall status of the appliance'
  )
}).label('Appliance')

// ============================================================================
// FUEL SCHEMA
// ============================================================================
export const fuelSchema = Joi.object({
  // Start of fuel application fields
  companyName: Joi.string().required().description('Manufacturer'),
  isUkBased: Joi.boolean().required().description('Is the company UK based?'),
  companyFullAddress: Joi.string()
    .when('isUkBased', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company address for overseas/non-UK-based companies'),
  companyAddress: Joi.object({
    uprn: Joi.string()
      .optional()
      .description('Company address UPRN (Unique Property Reference Number)'),
    line1: Joi.string().required().description('Company address line 1'),
    line2: Joi.string().optional().description('Company address line 2'),
    city: Joi.string().required().description('Company city'),
    county: Joi.string().optional().description('Company county'),
    postcode: Joi.string().required().description('Company postcode')
  }).when('isUkBased', {
    is: true,
    then: Joi.object().required(),
    otherwise: Joi.object().optional()
  }),
  companyContact: Joi.object({
    name: Joi.string().required().description('Manufacturer contact name'),
    email: Joi.string().required().description('Manufacturer contact email'),
    alternativeEmail: Joi.string()
      .optional()
      .allow(null)
      .empty(null) // allow null to be treated as missing i.e optional
      .description('Manufacturer alternative contact email'),
    phone: Joi.string()
      .trim()
      .optional()
      .allow(null)
      .empty(null)
      .pattern(/^(0\d{10}|\+\d{11,13})$/)
      .description(
        'Company contact phone number. Accepts local UK numbers (e.g. 07582812432) and international numbers with an optional leading + (e.g. +445398914260).'
      )
  }),
  responsibleName: Joi.string().required().description('Responsible name'),
  responsibleEmailAddress: Joi.string()
    .optional()
    .description('Responsible email address'),
  customerComplaints: Joi.boolean()
    .required()
    .description('System for customer complaints in place'),
  fuelBagging: Joi.string()
    .required()
    .description('How do you sell this fuel, options provided'),
  manufacturerOrReseller: Joi.string()
    .valid('Manufacturer', 'Reseller')
    .required()
    .description('Manufacturer or rebranded/reseller'),
  fuelDescription: Joi.string().required().description('Fuel description'),
  //If a reseller, these fields become required:
  originalFuelManufacturer: Joi.string()
    .when('manufacturerOrReseller', {
      is: 'Reseller',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Original fuel manufacturer'),
  originalFuelNameOrBrand: Joi.string()
    .when('manufacturerOrReseller', {
      is: 'Reseller',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Original fuel name or brand'),
  changedFromOriginalFuel: Joi.boolean()
    .when('manufacturerOrReseller', {
      is: 'Reseller',
      then: Joi.boolean().required(),
      otherwise: Joi.boolean().optional()
    })
    .description('Changes to original fuel: yes or no'),
  changesMade: Joi.string()
    .optional()
    .description('Explain changes made to the original fuel'),
  resellBrandName: Joi.string()
    .when('manufacturerOrReseller', {
      is: 'Reseller',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('What brand name will you be reselling'), //NEEDTO: new so needs to be added to cilent DB or mapped here
  //If a manufacturer, these fields become required:
  fuelWeight: Joi.number()
    .when('manufacturerOrReseller', {
      is: 'Manufacturer',
      then: Joi.number().required(),
      otherwise: Joi.number().optional()
    })
    .description('Fuel weight'),
  fuelComposition: Joi.string()
    .when('manufacturerOrReseller', {
      is: 'Manufacturer',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Fuel composition'),
  sulphurContent: Joi.number()
    .when('manufacturerOrReseller', {
      is: 'Manufacturer',
      then: Joi.number().required(),
      otherwise: Joi.number().optional()
    })
    .description('Sulphur content (%)'),
  manufacturingProcess: Joi.string()
    .when('manufacturerOrReseller', {
      is: 'Manufacturer',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Manufacturing process'),
  qualityControlSystem: Joi.string()
    .when('manufacturerOrReseller', {
      is: 'Manufacturer',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Quality manufactured system in place'),
  brandNames: Joi.string()
    .when('manufacturerOrReseller', {
      is: 'Manufacturer',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Brand name(s)'),
  //End of manufacturer/reseller
  declaration: Joi.boolean().required().description('Declaration'),
  // End of fuel application fields
  //Reviews/Certifications
  technicalReview: Joi.object({
    status: Joi.string()
      .allow('', null)
      .empty(['', null])
      .default('new')
      .valid('new', 'in_review', 'accepted', 'rejected')
      .optional(), //needs to be an optional field to allow it to be omitted and default to pending
    reviewer: Joi.object({
      name: Joi.string()
        .optional()
        .description('Name of the technical reviewer'),
      email: Joi.string()
        .optional()
        .description('Email of the technical reviewer')
    }),
    updatedAt: Joi.date()
      .optional()
      .description('Date technical review status changed')
  })
    .default(() => ({ status: 'new' }))
    .description(
      'This technical review happens during the application stage, compromises of several checks including test reports, comformity mark etc.'
    ),
  englandCertification: countryCertificationSchema.description(
    'England certification status'
  ),
  scotlandCertification: countryCertificationSchema.description(
    'Scotland certification status'
  ),
  walesCertification: countryCertificationSchema.description(
    'Wales certification status'
  ),
  nIrelandCertification: countryCertificationSchema.description(
    'Northern Ireland certification status'
  ),
  legacyRecord: Joi.boolean()
    .default(false)
    .description(
      'Records that have been migrated to the DB are deemed as legacy records'
    ),
  publishedDate: Joi.date().optional().description('Published date')
}).label('Fuel')

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
  reviewer: Joi.object({
    name: Joi.string().optional().description('Name of the reviewer'),
    email: Joi.string().optional().description('Email of the reviewer')
  })
    .optional()
    .allow(null)
    .description(
      'Assigned to this application, will be null first then comes from SSO'
    )
})
  .unknown(false)
  .label('Application')
