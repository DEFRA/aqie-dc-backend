import Joi from 'joi'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
export const applienceSchema = Joi.object({
  permittedFuels: Joi.string().required().description('Permitted fuels'),
  manufacturer: Joi.string().required().description('Manufacturer'),
  manufacturerAddress: Joi.string()
    .required()
    .description('Manufacturer address'),
  manufacturerContactName: Joi.string()
    .required()
    .description('Manufacturer contact name'),
  manufacturerContactEmail: Joi.string()
    .required()
    .description('Manufacturer contact email'),
  manufacturerAlternateContactEmail: Joi.string()
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
  exsistingAuthorizedAppliance: Joi.string()
    .optional()
    .description('Exsisting authorized appliance'),
  nominalOutput: Joi.number().required().description('Nominal output (kW)'),
  allowedFuels: Joi.string().required().description('Allowed fuels'),
  testReport: Joi.string().required().description('Test report'),
  technicalDrawings: Joi.string().required().description('Technical drawings'),
  ceMark: Joi.string().required().description('CE mark'),
  conditionForUse: Joi.string().required().description('Condition for use'),
  instructionManualTitle: Joi.string()
    .required()
    .description('Instruction manual title'),
  instructionManualDate: Joi.date()
    .required()
    .description('Instruction manual date'),
  instructionManualReference: Joi.string()
    .required()
    .description('Instruction manual reference'),
  submittedBy: Joi.string().required().description('Submitted by'),
  approvedBy: Joi.string().required().description('Approved by'),
  publishedDate: Joi.date().required().description('Published date')
}).label('Appliance')

export const fuelSchema = Joi.object({
  manufacturer: Joi.string().required().description('Manufacturer'),
  manufacturerAddress: Joi.string()
    .required()
    .description('Manufacturer address'),
  manufacturerContactName: Joi.string()
    .required()
    .description('Manufacturer contact name'),
  manufacturerContactEmail: Joi.string()
    .required()
    .description('Manufacturer contact email'),
  manufacturerAlternateContactEmail: Joi.string()
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
  representativeName: Joi.string()
    .required()
    .description('Representative name'),
  representativeEmailAddress: Joi.string()
    .required()
    .description('Representative email address'),
  customerComplaints: Joi.boolean()
    .required()
    .description('Customer complaints'),
  qualityControlSystem: Joi.string()
    .required()
    .description('Quality control system'),
  certificationScheme: Joi.string()
    .required()
    .description('Certification scheme'),
  fuelName: Joi.string().required().description('Fuel name'),
  fuelBagging: Joi.string().required().description('Fuel bagging'),
  baggedAtSource: Joi.boolean().required().description('Bagged at source'),
  fuelDescription: Joi.string().required().description('Fuel description'),
  fuelWeight: Joi.number().required().description('Fuel weight'),
  fuelComposition: Joi.string().required().description('Fuel composition'),
  sulphurContent: Joi.number().required().description('Sulphur content (%)'),
  manufacturingProcess: Joi.string()
    .required()
    .description('Manufacturing process'),
  rebrandedProduct: Joi.boolean().required().description('Rebranded product'),
  changedFromOriginalFuel: Joi.boolean()
    .required()
    .description('Changed from original fuel'),
  brandNames: Joi.string().required().description('Brand name(s)'),
  testReports: Joi.string().required().description('Test reports'),
  fuelAdditionalDocuments: Joi.string()
    .required()
    .description('Fuel additional documents')
}).label('Fuel')
