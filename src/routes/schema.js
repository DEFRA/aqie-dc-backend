import Joi from 'joi'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()

const approvalField = Joi.string()
  .allow('', null)
  .empty(['', null])
  .default('Pending')
  .valid('Approved', 'Rejected', 'Revoked', 'Pending')
  .description('Approval status')

export const applianceSchema = Joi.object({
  manufacturerName: Joi.string().required().description('Manufacturer name'),
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
    .required()
    .description('Manufacturer alternate contact email'),
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
  modelName: Joi.string().required().description('Model name'),
  modelNumber: Joi.number().required().description('Model number'),
  applianceType: Joi.string().required().description('Appliance type'),
  isVariant: Joi.boolean().required().description('Variant of appliance'),
  existingAuthorisedAppliance: Joi.string()
    .optional()
    .description('Existing authorised appliance'),
  nominalOutput: Joi.number().required().description('Nominal output (kW)'),
  multiFuelAppliance: Joi.boolean()
    .required()
    .description('Multifuel capability'),
  allowedFuels: Joi.string().required().description('Allowed fuels'),
  testReport: Joi.string().required().description('Test report'),
  technicalDrawings: Joi.string().required().description('Technical drawings'),
  ceMark: Joi.string().required().description('CE mark'),
  conditionForUse: Joi.string().required().description('Condition for use'),
  instructionManual: Joi.string().required().description('Instruction manual'),
  instructionManualTitle: Joi.string()
    .required()
    .description('Instruction manual title'),
  instructionManualDate: Joi.date()
    .required()
    .description('Instruction manual date'),
  instructionManualVersion: Joi.string()
    .required()
    .description('Instruction manual version'),
  declaration: Joi.boolean().required().description('Declaration'),
  instructionManualAdditionalInfo: Joi.string()
    .required()
    .description('Instruction manual additional information'),
  airControlModifications: Joi.string()
    .required()
    .description('Air control modifications'),
  submittedBy: Joi.string().required().description('Submitted by'),
  approvedBy: Joi.string().required().description('Approved by'),
  publishedDate: Joi.date().required().description('Published date'),
  submittedDate: Joi.date().required().description('Submitted date'),
  technicalApproval: approvalField.description('Technical approval'),
  walesApproval: approvalField.description('Wales approval status'),
  nIrelandApproval: approvalField.description(
    'Northern Ireland approval status'
  ),
  scotlandApproval: approvalField.description('Scotland approval status'),
  englandApproval: approvalField.description('England approval status')
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
  approvedBy: Joi.string().required().description('Approved by'),
  publishedDate: Joi.date().required().description('Published date'),
  submittedDate: Joi.date().required().description('Submitted date'),
  technicalApproval: approvalField.description('Technical approval'),
  walesApproval: approvalField.description('Wales approval status'),
  nIrelandApproval: approvalField.description(
    'Northern Ireland approval status'
  ),
  scotlandApproval: approvalField.description('Scotland approval status'),
  englandApproval: approvalField.description('England approval status')
}).label('Fuel')
