import * as fuelController from '../../controllers/fuels-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

//Note: This is the orginal code extracted, needs to be compared to Ulys code and refactored/reviewed
export const getAllFuel = {
  //change to getAllFuels after refactor, duplicate of getAllAppliances so after refactored that file then need to refactor this one too
  // GET all
  method: 'GET',
  path: '/fuels',
  options: {
    tags: ['api', 'fuels'],
    description: 'Get all fuels'
  },
  handler: async (request, h) => {
    try {
      const result = await fuelController.getAllFuels(request.db)
      return h.response(result).code(statusCodes.ok)
    } catch (err) {
      request.logger.error(err, 'Failed to fetch items')
      return h
        .response({ msg: 'Failed to fetch items' })
        .code(statusCodes.internalServerError)
    }
  }
}
