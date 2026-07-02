/**
 * Delete fuel
 */

import Joi from 'joi'
import * as fuelController from '../../controllers/fuels-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const deleteFuel = {
  method: 'DELETE',
  path: '/fuels/{fuelId}',
  options: {
    tags: ['api', 'fuels'],
    description: 'Delete fuel by ID',
    validate: {
      params: Joi.object({
        fuelId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { fuelId } = request.params

    try {
      const { notFound } = await fuelController.deleteFuel(request.db, fuelId)
      if (notFound)
        return h.response({ msg: 'Not found' }).code(statusCodes.notFound)
      return h.response({ msg: 'Deleted', fuelId }).code(statusCodes.ok)
    } catch (err) {
      request.logger.error(err, 'Failed to delete fuel')
      return h
        .response({ msg: 'Failed to delete fuel' })
        .code(statusCodes.internalServerError)
    }
  }
}
