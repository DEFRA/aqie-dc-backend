import * as applianceController from '../../controllers/appliance-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

//Note: this code has been moved from api, needs refactoring
export const getAllAppliance = {
  //change to getAllAppliances after refactor
  // GET all
  method: 'GET',
  path: '/appliances',
  options: {
    tags: ['api', 'appliances'],
    description: 'Get all appliances'
  },
  handler: async (request, h) => {
    try {
      const items = await applianceController.findAllAppliance(
        request.db,
        request.params.type
      )
      return h.response({ msg: 'OK', data: items }).code(statusCodes.ok)
    } catch (err) {
      request.logger.error(err, 'Failed to fetch items')
      return h.response({ msg: 'Failed to fetch items' }).code(statusCodes.internalServerError)
    }
  }
}
