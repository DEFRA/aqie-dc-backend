import Joi from 'joi'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()

const approvalField = Joi.string()
  .allow('', null)
  .empty(['', null])
  .default('Uncertified')
  .valid('Certified', 'Revoked', 'Uncertified')
  .optional() //needs to be an optional field to allow it to be omitted and default to Uncertified

const fuelOptions = ['Wood Logs', 'Wood Pellets', 'Wood Chips', 'Other']

const INVALID_PHONE_ERROR = 'any.invalid'

export const applianceSchema = Joi.object({
  // Start of appliance application fields
  companyName: Joi.string().required().description('Company name'),
  isUkBased: Joi.boolean().required().description('Is the company UK based?'),
  companyAddress: Joi.string()
    .when('isUkBased', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company address for non-UK-based companies'),
  companyAddressLine1: Joi.string()
    .when('isUkBased', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company address line 1'),
  companyAddressLine2: Joi.string()
    .optional()
    .description('Company address line 2'),
  companyAddressCity: Joi.string()
    .when('isUkBased', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company city'),
  companyAddressCounty: Joi.string().optional().description('Company county'),
  companyAddressPostcode: Joi.string()
    .when('isUkBased', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company postcode'),
  companyContactName: Joi.string()
    .required()
    .description('Company contact name'),
  companyContactEmail: Joi.string()
    .required()
    .description('Company contact email'),
  companyAlternateEmail: Joi.string()
    .optional()
    .description('Company alternate contact email'),
  companyPhone: Joi.string()
    .trim()
    .optional()
    .custom((value, helpers) => {
      try {
        // If you know the user's country, pass it here (e.g., 'GB', 'US')
        const number = phoneUtil.parse(value, undefined) // undefined = expects +countrycode
        if (!phoneUtil.isValidNumber(number)) {
          return helpers.error(INVALID_PHONE_ERROR)
        }
        const e164 = phoneUtil.format(number, 1) // 1 = E164
        return e164
      } catch {
        return helpers.error(INVALID_PHONE_ERROR)
      }
    }, 'libphonenumber validation')
    .messages({
      [INVALID_PHONE_ERROR]: 'Invalid phone number'
    })
    .description('Validated and normalized with google-libphonenumber'),

  modelName: Joi.string().required().description('Model name'),
  modelNumber: Joi.number().optional().description('Model number'),
  applianceType: Joi.string()
    .required()
    .description('Appliance type e.g. "heat"'),
  isVariant: Joi.boolean().required().description('Variant of appliance'),
  existingAuthorisedAppliance: Joi.string()
    .optional()
    .description('If it is a variant, details'),
  nominalOutput: Joi.number().required().description('Thermal output (kW)'),
  allowedFuels: Joi.array()
    .single() // "Wood Logs" -> ["Wood Logs"]
    .items(Joi.string().valid(...fuelOptions))
    .min(1)
    .unique()
    .required()
    .description('Allowed fuels'),
  instructionManualTitle: Joi.string()
    .required()
    .description('Instruction manual title'),
  instructionManualDate: Joi.date()
    .required()
    .description('Instruction manual date'),
  instructionManualVersion: Joi.string()
    .optional()
    .description('Instruction manual version'),
  instructionManualAdditionalInfo: Joi.string()
    .optional()
    .description('Instruction manual additional information'),
  // multiFuelAppliance: Joi.boolean()
  //   .required()
  //   .description('Multifuel capability'),
  declaration: Joi.boolean().required().description('Declaration'),
  // End of appliance application fields
  //is this added later?
  airControlModifications: Joi.string()
    .optional()
    .description('Air control modifications'),
  instructionManual: Joi.string()
    .optional()
    .description('Instruction manual file'),
  testReport: Joi.string().optional().description('Test report'),
  technicalDrawings: Joi.string().optional().description('Technical drawings'),
  ceMark: Joi.string().optional().description('CE mark'),
  //Files added later
  submittedBy: Joi.string().optional().description('Submitted by'),
  submittedDate: Joi.date().optional().description('Submitted date'),
  publishedDate: Joi.date().optional().description('Published date'),
  technicalApproval: approvalField.description('Technical approval'),
  ratedOutput: Joi.number().optional().description('Rated Output'),
  testedOutputRated: Joi.number()
    .optional()
    .description('Tested Output - rated'),
  testedOutputLow: Joi.number().optional().description('Tested Output - low'),
  smokeEmissionOutputRated: Joi.number()
    .optional()
    .description('Smoke emission output - rated'),
  smokeEmissionOutputLow: Joi.number()
    .optional()
    .description('Smoke emission output - low'),
  walesApproval: approvalField.description('Wales approval status'),
  nIrelandApproval: approvalField.description(
    'Northern Ireland approval status'
  ),
  scotlandApproval: approvalField.description('Scotland approval status'),
  englandApproval: approvalField.description('England approval status'),
  walesApprovedBy: Joi.string().optional().description('Wales approved by'),
  nIrelandApprovedBy: Joi.string()
    .optional()
    .description('Northern Ireland approved by'),
  scotlandApprovedBy: Joi.string()
    .optional()
    .description('Scotland approved by'),
  englandApprovedBy: Joi.string().optional().description('England approved by'),
  walesDateFirstAuthorised: Joi.date()
    .optional()
    .description('Wales date first authorised'),
  nIrelandDateFirstAuthorised: Joi.date()
    .optional()
    .description('Northern Ireland date first authorised'),
  scotlandDateFirstAuthorised: Joi.date()
    .optional()
    .description('Scotland date first authorised'),
  englandDateFirstAuthorised: Joi.date()
    .optional()
    .description('England date first authorised')
}).label('Appliance')

export const fuelSchema = Joi.object({
  // Start of fuel application fields
  companyName: Joi.string().required().description('Manufacturer'),
  isUkBased: Joi.boolean().required().description('Is the company UK based?'),
  companyAddress: Joi.string()
    .when('isUkBased', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Manufacturer address for overseas non-UK-based companies'),
  companyAddressLine1: Joi.string()
    .when('isUkBased', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company address line 1'),
  companyAddressLine2: Joi.string()
    .optional()
    .description('Company address line 2'),
  companyAddressCity: Joi.string()
    .when('isUkBased', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company city'),
  companyAddressCounty: Joi.string().optional().description('Company county'),
  companyAddressPostcode: Joi.string()
    .when('isUkBased', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
    .description('Company postcode'),
  companyContactName: Joi.string()
    .required()
    .description('Manufacturer contact name'),
  companyContactEmail: Joi.string()
    .required()
    .description('Manufacturer contact email'),
  companyAlternateEmail: Joi.string()
    .optional()
    .description('Manufacturer alternate email'),
  companyPhone: Joi.string()
    .trim()
    .optional()
    .custom((value, helpers) => {
      try {
        // If you know the user's country, pass it here (e.g., 'GB', 'US')
        const number = phoneUtil.parse(value, undefined) // undefined = expects +countrycode
        if (!phoneUtil.isValidNumber(number)) {
          return helpers.error(INVALID_PHONE_ERROR)
        }
        const e164 = phoneUtil.format(number, 1) // 1 = E164
        return e164
      } catch {
        return helpers.error(INVALID_PHONE_ERROR)
      }
    }, 'libphonenumber validation')
    .messages({
      [INVALID_PHONE_ERROR]: 'Invalid phone number'
    })
    .description('Validated and normalized with google-libphonenumber'),
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
  // baggedAtSource: Joi.boolean().required().description('Bagged at source'),
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
    .description('What brand name will you be reselling'), //new so needs to be added to cilent DB
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
  letterFromManufacturer: Joi.string()
    .optional()
    .description('Letter from manufacturer'),
  testReports: Joi.string().optional().description('Test reports'),
  fuelAdditionalDocuments: Joi.string()
    .optional()
    .description('Fuel additional documents'),
  submittedBy: Joi.string().optional().description('Submitted by'),
  publishedDate: Joi.date().optional().description('Published date'),
  submittedDate: Joi.date().optional().description('Submitted date'),
  technicalApproval: approvalField.description('Technical approval'),
  walesApproval: approvalField.description('Wales approval status'),
  nIrelandApproval: approvalField.description(
    'Northern Ireland approval status'
  ),
  scotlandApproval: approvalField.description('Scotland approval status'),
  englandApproval: approvalField.description('England approval status'),
  walesApprovedBy: Joi.string().optional().description('Wales approved by'),
  nIrelandApprovedBy: Joi.string()
    .optional()
    .description('Northern Ireland approved by'),
  scotlandApprovedBy: Joi.string()
    .optional()
    .description('Scotland approved by'),
  englandApprovedBy: Joi.string().optional().description('England approved by'),
  walesDateFirstAuthorised: Joi.date()
    .optional()
    .description('Wales date first authorised'),
  nIrelandDateFirstAuthorised: Joi.date()
    .optional()
    .description('Northern Ireland date first authorised'),
  scotlandDateFirstAuthorised: Joi.date()
    .optional()
    .description('Scotland date first authorised'),
  englandDateFirstAuthorised: Joi.date()
    .optional()
    .description('England date first authorised'),
  walesDateLastUpdated: Joi.date()
    .optional()
    .description('Wales date last updated (last certified or revoked)'),
  nIrelandDateLastUpdated: Joi.date()
    .optional()
    .description(
      'Northern Ireland date last updated (last certified or revoked)'
    ),
  scotlandDateLastUpdated: Joi.date()
    .optional()
    .description('Scotland date last updated (last certified or revoked)'),
  englandDateLastUpdated: Joi.date()
    .optional()
    .description('England date last updated (last certified or revoked)')
}).label('Fuel')
