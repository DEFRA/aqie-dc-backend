import Joi from 'joi'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()

const approvalField = Joi.string()
  .allow('', null)
  .empty(['', null])
  .default('Uncertified')
  .valid('Certified', 'Revoked', 'Uncertified')

const fuelOptions = ['Wood Logs', 'Wood Pellets', 'Wood Chips', 'Other']

const INVALID_PHONE_ERROR = 'any.invalid'

export const applianceSchema = Joi.object({
  companyName: Joi.string().required().description('Company name'),
  companyAddress: Joi.string().required().description('Company address'),
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
  modelNumber: Joi.number().required().description('Model number'),
  applianceType: Joi.string().required().description('Appliance type'),
  isVariant: Joi.boolean().required().description('Variant of appliance'),
  existingAuthorisedAppliance: Joi.string()
    .required()
    .description('Existing authorised appliance'),
  nominalOutput: Joi.number().required().description('Nominal output (kW)'),
  multiFuelAppliance: Joi.boolean()
    .required()
    .description('Multifuel capability'),
  allowedFuels: Joi.array()
    .single() // "Wood Logs" -> ["Wood Logs"]
    .items(Joi.string().valid(...fuelOptions))
    .min(1)
    .unique()
    .required()
    .description('Allowed fuels'),

  testReport: Joi.string().required().description('Test report'),
  technicalDrawings: Joi.string().required().description('Technical drawings'),
  ceMark: Joi.string().required().description('CE mark'),
  conditionsForUse: Joi.string().required().description('Conditions for use'),
  instructionManual: Joi.string().required().description('Instruction manual'),
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
  airControlModifications: Joi.string()
    .optional()
    .description('Air control modifications'),
  declaration: Joi.boolean().required().description('Declaration'),
  submittedBy: Joi.string().required().description('Submitted by'),
  submittedDate: Joi.date().required().description('Submitted date'),
  publishedDate: Joi.date().required().description('Published date'),
  technicalApproval: approvalField.description('Technical approval'),
  walesApproval: approvalField.description('Wales approval status'),
  nIrelandApproval: approvalField.description(
    'Northern Ireland approval status'
  ),
  scotlandApproval: approvalField.description('Scotland approval status'),
  englandApproval: approvalField.description('England approval status'),
  walesApprovedBy: Joi.string().required().description('Wales approved by'),
  nIrelandApprovedBy: Joi.string()
    .required()
    .description('Northern Ireland approved by'),
  scotlandApprovedBy: Joi.string()
    .required()
    .description('Scotland approved by'),
  englandApprovedBy: Joi.string().required().description('England approved by'),
  walesDateFirstAuthorised: Joi.date()
    .required()
    .description('Wales date first authorised'),
  nIrelandDateFirstAuthorised: Joi.date()
    .required()
    .description('Northern Ireland date first authorised'),
  scotlandDateFirstAuthorised: Joi.date()
    .required()
    .description('Scotland date first authorised'),
  englandDateFirstAuthorised: Joi.date()
    .required()
    .description('England date first authorised')
}).label('Appliance')

export const fuelSchema = Joi.object({
  manufacturerName: Joi.string().required().description('Manufacturer'),
  manufacturerAddress: Joi.string()
    .required()
    .description('Manufacturer address'),
  manufacturerContactName: Joi.string()
    .required()
    .description('Manufacturer contact name'),
  manufacturerContactEmail: Joi.string()
    .required()
    .description('Manufacturer contact email'),
  manufacturerAlternateEmail: Joi.string()
    .optional()
    .description('Manufacturer alternate email'),
  manufacturerPhone: Joi.string()
    .trim()
    .optional()
    .custom((value, helpers) => {
      try {
        // If you know the user's country, pass it here (e.g., 'GB', 'US')
        const number = phoneUtil.parse(value, undefined) // undefined = expects +countrycode
        if (!phoneUtil.isValidNumber(number)) {
          return helpers.error('any.invalid')
        }
        const e164 = phoneUtil.format(number, 1) // 1 = E164
        return e164
      } catch {
        return helpers.error('any.invalid')
      }
    }, 'libphonenumber validation')
    .messages({
      'any.invalid': 'Invalid phone number'
    })
    .description('Validated and normalized with google-libphonenumber'),
  responsibleName: Joi.string().required().description('Responsible name'),
  responsibleEmailAddress: Joi.string()
    .optional()
    .description('Responsible email address'),
  customerComplaints: Joi.boolean()
    .required()
    .description('Customer complaints'),
  qualityControlSystem: Joi.string()
    .required()
    .description('Quality control system'),
  manufacturerOrReseller: Joi.string()
    .valid('Manufacturer', 'Reseller')
    .required()
    .description('Manufacturer or reseller'),
  originalFuelManufacturer: Joi.string()
    .optional()
    .description('Original fuel manufacturer'),
  originalFuelNameOrBrand: Joi.string()
    .optional()
    .description('Original fuel name or brand'),
  changedFromOriginalFuel: Joi.boolean()
    .required()
    .description('Changed from original fuel'),
  changesMade: Joi.string()
    .required()
    .description('Changes made to the original fuel'),
  fuelBagging: Joi.string().required().description('Fuel bagging'),
  baggedAtSource: Joi.boolean().required().description('Bagged at source'),
  fuelDescription: Joi.string().required().description('Fuel description'),
  fuelWeight: Joi.number().required().description('Fuel weight'),
  fuelComposition: Joi.string().required().description('Fuel composition'),
  sulphurContent: Joi.number().required().description('Sulphur content (%)'),
  manufacturingProcess: Joi.string()
    .required()
    .description('Manufacturing process'),
  brandNames: Joi.string().required().description('Brand name(s)'),
  letterFromManufacturer: Joi.string()
    .required()
    .description('Letter from manufacturer'),
  testReports: Joi.string().required().description('Test reports'),
  fuelAdditionalDocuments: Joi.string()
    .required()
    .description('Fuel additional documents'),
  declaration: Joi.boolean().required().description('Declaration'),
  submittedBy: Joi.string().required().description('Submitted by'),
  publishedDate: Joi.date().required().description('Published date'),
  submittedDate: Joi.date().required().description('Submitted date'),
  technicalApproval: approvalField.description('Technical approval'),
  walesApproval: approvalField.description('Wales approval status'),
  nIrelandApproval: approvalField.description(
    'Northern Ireland approval status'
  ),
  scotlandApproval: approvalField.description('Scotland approval status'),
  englandApproval: approvalField.description('England approval status'),
   walesApprovedBy: Joi.string().required().description('Wales approved by'),
  nIrelandApprovedBy: Joi.string()
    .required()
    .description('Northern Ireland approved by'),
  scotlandApprovedBy: Joi.string()
    .required()
    .description('Scotland approved by'),
  englandApprovedBy: Joi.string().required().description('England approved by'),
  walesDateFirstAuthorised: Joi.date()
    .required()
    .description('Wales date first authorised'),
  nIrelandDateFirstAuthorised: Joi.date()
    .required()
    .description('Northern Ireland date first authorised'),
  scotlandDateFirstAuthorised: Joi.date()
    .required()
    .description('Scotland date first authorised'),
  englandDateFirstAuthorised: Joi.date()
    .required()
    .description('England date first authorised')
}).label('Fuel')
