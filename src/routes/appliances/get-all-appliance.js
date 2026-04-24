import * as applianceController from '../../controllers/appliance-controller.js'

//Note: this code has been moved from api, needs refactoring
export const getAllAppliance = {
  //change to getAllAppliances after refactor
  // GET all
  method: 'GET',
  path: '/get-all/appliances',
  options: {
    tags: ['api', 'read'],
    description: 'Get all appliances'
  },
  handler: async (request, h) => {
    try {
      const items = await applianceController.findAllAppliance(
        request.db,
        request.params.type
      )
      return h.response({ msg: 'OK', data: items }).code(200)
    } catch (err) {
      request.server.logger?.error(err, 'Failed to fetch items')
      return h.response({ msg: 'Failed to fetch items' }).code(500)
    }
  }
}
