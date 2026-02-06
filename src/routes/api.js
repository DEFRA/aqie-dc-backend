import Joi from 'joi'
import pkg from 'google-libphonenumber'
import {
  createItem,
  findAllItems,
  findItem,
  updateItem,
  deleteItem
} from './db-service.js'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()

const applienceSchema = Joi.object({
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

const fuelSchema = Joi.object({
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

export const api = [
  {
    method: 'POST',
    path: '/add-new/{type}',
    options: {
      tags: ['api', 'new'],
      description: 'Create new appliance or fuel',

      validate: {
        params: Joi.object({
          type: Joi.string().valid('appliance', 'fuel').required()
        }),

        // SHOW correct JSON example in Swagger, but do NOT validate here
        payload: Joi.object()
          .meta({ className: 'ApplianceOrFuelInput' })
          .example({
            appliance: {
              permittedFuels: 'wood',
              manufacturer: 'ACME',
              manufacturerAddress: '123 Street',
              manufacturerContactName: 'John Doe',
              manufacturerContactEmail: 'john@acme.com',
              manufacturerAlternateContactEmail: 'alt@acme.com',
              manufacturerPhone: '+44111222123',
              modelName: 'Model X',
              modelNumber: 123,
              applianceType: 'heat',
              isVariant: false,
              nominalOutput: 10,
              allowedFuels: 'wood',
              testReport: 'TR-001',
              technicalDrawings: 'drawing.pdf',
              ceMark: 'CE123',
              conditionForUse: 'indoor',
              instructionManualTitle: 'Manual X',
              instructionManualDate: '2026-02-03',
              instructionManualReference: 'IM-123',
              submittedBy: 'Alice',
              approvedBy: 'Bob',
              publishedDate: '2026-02-03'
            },
            fuel: {
              manufacturer: 'FuelCo',
              manufacturerAddress: 'Some address',
              manufacturerContactName: 'Fuel Person',
              manufacturerContactEmail: 'fuel@co.com',
              manufacturerAlternateContactEmail: 'alt@co.com',
              manufacturerPhone: '+441234567890',
              representativeName: 'Rep Name',
              representativeEmailAddress: 'rep@co.com',
              customerComplaints: false,
              qualityControlSystem: 'ISO certified',
              certificationScheme: 'Scheme A',
              fuelName: 'Pellets',
              fuelBagging: 'Machine',
              baggedAtSource: true,
              fuelDescription: 'Premium pellets',
              fuelWeight: 20,
              fuelComposition: 'Wood 100%',
              sulphurContent: 0.7,
              manufacturingProcess: 'Kiln-dried',
              rebrandedProduct: false,
              changedFromOriginalFuel: false,
              brandNames: 'PelletBrand',
              testReports: 'TR-F-122',
              fuelAdditionalDocuments: 'Extra.pdf'
            }
          })
          .description('Payload depends on the type param (appliance or fuel)')
          .unknown(true) // allow anything, since real validation is in pre
      },

      pre: [
        {
          assign: 'validatedPayload',
          method: (request, h) => {
            const { type } = request.params
            const schema = type === 'appliance' ? applienceSchema : fuelSchema

            const { value, error } = schema.validate(request.payload, {
              abortEarly: false
            })
            if (error) throw error
            return value
          },
          failAction: (request, h, error) => {
            // Return 400 with validation details
            return h
              .response({ msg: 'Validation failed', details: error.details })
              .code(400)
              .takeover()
          }
        }
      ]
    },
    //const collection = db.collection(type)

    handler: async (request, h) => {
      const newItem = {
        ...request.pre.validatedPayload
      }
      try {
        const inserted = await createItem(
          request.db,
          request.params.type,
          newItem
        )
        const applicationId =
          inserted.applianceId || inserted.fuelId || String(inserted._id)
        return h.response({ msg: 'Created', applicationId }).code(201)
      } catch (err) {
        request.server.logger?.error(err, 'Failed to create item')
        return h.response({ msg: 'Failed to create item' }).code(500)
      }
    }
  },
  // GET all
  {
    method: 'GET',
    path: '/get-all/{type}',
    options: {
      tags: ['api', 'read'],
      description: 'Get all items for the given type (appliance|fuel)',
      validate: {
        params: Joi.object({
          type: Joi.string().valid('appliance', 'fuel').required()
        })
      }
    },
    handler: async (request, h) => {
      try {
        const items = await findAllItems(request.db, request.params.type)
        return h.response({ msg: 'OK', data: items }).code(200)
      } catch (err) {
        request.server.logger?.error(err, 'Failed to fetch items')
        return h.response({ msg: 'Failed to fetch items' }).code(500)
      }
    }
  },

  // GET one
  {
    method: 'GET',
    path: '/get/{type}/{applicationId}',
    options: {
      tags: ['api', 'update'],
      description: 'Update item fields for the given type and applicationId',

      validate: {
        params: Joi.object({
          type: Joi.string().valid('appliance', 'fuel').required(),
          applicationId: Joi.string().required()
        })
      }
    },
    handler: async (request, h) => {
      try {
        const { type, applicationId } = request.params
        const item = await findItem(request.db, type, applicationId)
        if (!item) return h.response({ msg: 'Not found' }).code(404)
        return h.response({ msg: 'OK', data: item }).code(200)
      } catch (err) {
        request.server.logger?.error(err, 'Failed to fetch item')
        return h.response({ msg: 'Failed to fetch item' }).code(500)
      }
    }
  },

  // PATCH update
  {
    method: 'PATCH',
    path: '/update/{type}/{applicationId}',
    options: {
      tags: ['api', 'update'],
      description: 'Update item fields for the given type and applicationId',
      validate: {
        params: Joi.object({
          type: Joi.string().valid('appliance', 'fuel').required(),
          applicationId: Joi.string().required()
        }),
        payload: Joi.object().unknown(true)
      }
    },
    handler: async (request, h) => {
      try {
        const { type, applicationId } = request.params
        const { notFound, updated } = await updateItem(
          request.db,
          type,
          applicationId,
          request.payload
        )
        if (notFound) return h.response({ msg: 'Not found' }).code(404)
        return h.response({ msg: 'Updated', data: updated }).code(200)
      } catch (err) {
        request.server.logger?.error(err, 'Failed to update item')
        return h.response({ msg: 'Failed to update item' }).code(500)
      }
    }
  },

  // DELETE
  {
    method: 'DELETE',
    path: '/delete/{type}/{applicationId}',
    options: {
      tags: ['api', 'delete'],
      description: 'Delete item for the given type and applicationId',
      validate: {
        params: Joi.object({
          type: Joi.string().valid('appliance', 'fuel').required(),
          applicationId: Joi.string().required()
        })
      }
    },
    handler: async (request, h) => {
      try {
        const { type, applicationId } = request.params
        const { notFound } = await deleteItem(request.db, type, applicationId)
        if (notFound) return h.response({ msg: 'Not found' }).code(404)
        return h.response({ msg: 'Deleted', applicationId }).code(200)
      } catch (err) {
        request.server.logger?.error(err, 'Failed to delete item')
        return h.response({ msg: 'Failed to delete item' }).code(500)
      }
    }
  }
]
