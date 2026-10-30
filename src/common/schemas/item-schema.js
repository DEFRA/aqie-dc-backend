import Joi from 'joi'
import {
  COUNTRY_CERTIFICATION_STATUSES,
  DEFAULT_COUNTRY_CERTIFICATION_STATUS
} from '../helpers/certification.js'

export const countryCertificationSchema = Joi.object({
  // 1. Current State Metadata
  status: Joi.string()
    .valid(...COUNTRY_CERTIFICATION_STATUSES)
    .default(DEFAULT_COUNTRY_CERTIFICATION_STATUS),
  decidedAt: Joi.date().iso().allow(null).default(null),
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
  id: Joi.string()
    .pattern(/^APP-[A-Za-z0-9]+$/)
    .description('Appliance ID (primary key) system-generated.'),
  // Fields from DXT form input
  applicationId: Joi.string()
    .optional()
    .description(
      'Application ID (foreign key), unique identifier and display identifier (last digits) (server-generated)'
    ),
  // Start of appliance application fields
  companyName: Joi.string().required().description('Company name'),
  isUkBased: Joi.boolean().required().description('Is the company UK based?'),
  companyFullAddress: Joi.string()
    .when('isUkBased', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description(
      'Company address for overseas/non-UK-based companies. String with \n if user put enter in the DXT form.'
    ),
  companyAddress: Joi.object({
    uprn: Joi.string()
      .optional()
      .description(
        'Company address UPRN (Unique Property Reference Number, when address comes for address finder on DEFRA form)'
      ),
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
    email: Joi.string().email().required().description('Company contact email'),
    alternativeEmail: Joi.string()
      .email()
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
  otherApplianceType: Joi.string()
    .optional()
    .allow(null)
    .description(
      'Secondary appliance type when applianceType is "other". Values are sourced from the ApplianceTypes collection and may change without code changes.'
    ),
  isVariant: Joi.boolean().required().description('Variant of appliance'),
  existingAuthorisedAppliance: Joi.string()
    .optional()
    .allow(null)
    .description('If it is a variant, details'),
  nominalOutput: Joi.number().required().description('Thermal output (kW)'),
  multifuelAppliance: Joi.boolean()
    .required()
    .description('Multifuel capability'),
  permittedFuels: Joi.string()
    .trim()
    .min(1)
    .required()
    .description('The fuels the appliance will be certified to burn'),
  declaration: Joi.boolean().required().description('Declaration'),
  createdAt: Joi.date()
    .optional()
    .description(
      'When the appliance was created in our system (server-generated)'
    ),
  // Fields from admin FE input
  testResults: Joi.object({
    ratedOutput: Joi.number()
      .min(0)
      .allow(null)
      .optional()
      .description('Rated Output'),
    testedOutput: Joi.object({
      rated: Joi.number()
        .min(0)
        .allow(null)
        .optional()
        .description('Tested Output - rated'),
      low: Joi.number()
        .min(0)
        .allow(null)
        .optional()
        .description('Tested Output - low')
    }).optional(),
    smokeEmissionOutput: Joi.object({
      rated: Joi.number()
        .min(0)
        .allow(null)
        .optional()
        .description('Smoke emission output - rated'),
      low: Joi.number()
        .min(0)
        .allow(null)
        .optional()
        .description('Smoke emission output - low')
    }).optional()
  }).optional(),
  additionalConditions: Joi.string()
    .optional()
    .description(
      'Additional conditions previously referred to as air control modifications'
    ),
  instructionManual: Joi.object({
    title: Joi.string()
      .allow('', null)
      .optional()
      .description('Instruction manual title'),
    publicationDate: Joi.date()
      .iso()
      .allow(null)
      .optional()
      .description('Instruction manual publication date'),
    version: Joi.string()
      .allow('', null)
      .optional()
      .description('Instruction manual version'),
    additionalInfo: Joi.string()
      .allow('', null)
      .optional()
      .description('Instruction manual additional information')
  }).optional(),
  //Legacy record fields (additional fields from DB migration that no longer exist in the new admin system)
  servicingManual: Joi.object({
    title: Joi.string().optional().description('Servicing manual title'),
    publicationDate: Joi.date()
      .optional()
      .description('Servicing manual publication date'),
    version: Joi.string().optional().description('Servicing manual version'),
    additionalInfo: Joi.string()
      .optional()
      .description('Servicing manual additional information')
  }).optional(),
  legacy: Joi.object({
    comments: Joi.array().optional().description('Legacy comments'),
    applianceId: Joi.string().optional().description('Legacy appliance ID'),
    applicationId: Joi.string().optional().description('Legacy application ID'),
    linkedApplicationIds: Joi.array()
      .items(Joi.string())
      .optional()
      .description('Legacy linked application IDs')
  }).optional(),
  //Reviews/Certifications
  isPermittedToBurnWood: Joi.boolean()
    .allow(null)
    .optional()
    .description('Whether the appliance is permitted to burn wood'),
  technicalReview: Joi.object({
    status: Joi.string()
      .valid('new', 'in_review', 'accepted', 'rejected')
      .default('new'),
    reviewedAt: Joi.date()
      .iso()
      .default(null)
      .description('Date technical review status changed'),
    reviewedBy: Joi.object({
      name: Joi.string().optional().default(null),
      email: Joi.string().email().optional().default(null)
    }).default(),
    documentationChecks: Joi.object({
      testReports: Joi.boolean().allow(null).default(null),
      technicalDrawings: Joi.boolean().allow(null).default(null),
      conformityMark: Joi.boolean().allow(null).default(null),
      instructionManual: Joi.boolean().allow(null).default(null)
    }).default(),
    listingChecks: Joi.object({
      applianceDetails: Joi.boolean().allow(null).default(null),
      permittedFuels: Joi.boolean().allow(null).default(null),
      additionalConditions: Joi.boolean().allow(null).default(null)
    }).default()
  })
    .default()
    .description(
      'This technical review happens during the application stage, comprises of several checks including test reports, conformity mark etc.'
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
  //
  updatedAt: Joi.date()
    .optional()
    .description(
      'When the appliance was last updated in our system (server-generated), best practice to use this field when anything is updated in the appliance'
    ),
  // Fields for frontends
  isLegacyRecord: Joi.boolean()
    .default(false)
    .description(
      'Records that have been migrated to the DB are deemed as legacy records'
    ),
  isVisibleToPublic: Joi.boolean()
    .default(true)
    .description('Should this appliance be visible to the public?'),
  // need to put logic in to populate these fields
  publishedDate: Joi.date()
    .optional()
    .description('The earliest date of certification'),
  applianceStatus: Joi.string()
    .valid('pending', 'live', 'hidden', 'rejected')
    .description(
      'Takes in account the technical review and country certifications, and isVisibleToPublic to determine the overall status of the appliance'
    )
    .default('pending')
}).label('Appliance')

// ============================================================================
// FUEL SCHEMA
// ============================================================================
export const fuelSchema = Joi.object({
  id: Joi.string()
    .pattern(/^FUEL-[A-Za-z0-9]+$/)
    .description('Fuel ID (primary key) system-generated.'),
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
      .description(
        'Company address UPRN (Unique Property Reference Number, when address comes for address finder on DEFRA form)'
      ),
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
    email: Joi.string()
      .email()
      .required()
      .description('Manufacturer contact email'),
    alternativeEmail: Joi.string()
      .email()
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
  responsiblePerson: Joi.object({
    name: Joi.string().required().description('Responsible name'),
    email: Joi.string()
      .email()
      .optional()
      .allow(null)
      .empty(null) // allow null to be treated as missing i.e optional
      .description('Responsible email address')
  }),
  hasCustomerComplaintsSystem: Joi.boolean()
    .required()
    .description('Is a system for handling customer complaints in place?'),
  fuelBagging: Joi.string()
    .required()
    .description('How do you sell this fuel, options provided'),
  supplierType: Joi.string()
    .valid('Manufacture', 'Rebrand')
    .required()
    .description('Manufacture or Rebrand (used to be Reseller)'),
  brandName: Joi.string().required().description('Brand name'),
  additionalBrandNames: Joi.string()
    .optional()
    .description('Additional brand names, entered as a comma-separated list'),
  //If a rebrand, these fields become required:
  originalFuel: Joi.object({
    manufacturer: Joi.string()
      .required()
      .description('Original fuel manufacturer'),
    name: Joi.string().required().description('Original fuel name or brand'),
    isChangedOrMixed: Joi.boolean()
      .required()
      .description(
        'Has the original fuel been changed or mixed with another fuel: yes or no'
      ),
    changes: Joi.string()
      .when('isChangedOrMixed', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().allow(null, '').optional()
      })
      .description('Explain changes made to the original fuel')
  })
    .when('supplierType', {
      is: 'Rebrand',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Original fuel details (required for rebranders)'),
  //If a manufacturer, these fields become required:
  fuelDescription: Joi.object({
    appearance: Joi.string().required().description('Fuel description'),
    weight: Joi.string()
      .required()
      .description('Fuel weight comes as string from DXGT form'),
    composition: Joi.string().required().description('Fuel composition'),
    sulphurContent: Joi.number().required().description('Sulphur content (%)')
  })
    .when('supplierType', {
      is: 'Manufacture',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Fuel description details (required for manufacturers)'),
  manufacturingProcess: Joi.string()
    .when('supplierType', {
      is: 'Manufacture',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Manufacturing process'),
  hasQualityControlSystem: Joi.boolean()
    .when('supplierType', {
      is: 'Manufacture',
      then: Joi.boolean().required(),
      otherwise: Joi.boolean().optional()
    })
    .description('Is a monitored quality control system in place?'),
  //End of manufacturer/reseller
  declaration: Joi.boolean().required().description('Declaration'),
  createdAt: Joi.date()
    .optional()
    .description(
      'When the appliance was created in our system (server-generated)'
    ),
  // End of fuel application fields
  //Reviews/Certifications
  technicalReview: Joi.object({
    status: Joi.string()
      .valid('new', 'in_review', 'accepted', 'rejected')
      .default('new'),
    reviewedAt: Joi.date()
      .iso()
      .allow(null)
      .default(null)
      .description('Date technical review status changed'),
    reviewedBy: Joi.object({
      name: Joi.string().optional().default(null),
      email: Joi.string().email().optional().default(null)
    }).default(),
    documentationChecks: Joi.object({
      manufacturerLetter: Joi.boolean().allow(null).default(null),
      testResults: Joi.boolean().allow(null).default(null)
    }).default(),
    listingChecks: Joi.object({
      fuelDetails: Joi.boolean().allow(null).default(null),
      fuelDescription: Joi.boolean().allow(null).default(null)
    }).default()
  })
    .default()
    .description('This technical review happens during the application stage'),
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
  //
  updatedAt: Joi.date()
    .optional()
    .description(
      'When the fuel was last updated in our system (server-generated), best practice to use this field when anything is updated in the appliance'
    ),
  isLegacyRecord: Joi.boolean()
    .default(false)
    .description(
      'Records that have been migrated to the DB are deemed as legacy records'
    ),
  publishedDate: Joi.date().optional().description('Published date')
}).label('Fuel')
