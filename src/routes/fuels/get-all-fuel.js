import * as fuelController from '../../controllers/fuel-controller.js'

//Note: this code has been moved from api, needs refactoring
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
      const items = await fuelController.findAllFuel(
        request.db,
        request.params.type
      )
      return h.response({ msg: 'OK', data: items }).code(200)
    } catch (err) {
      request.logger.error(err, 'Failed to fetch items')
      return h.response({ msg: 'Failed to fetch items' }).code(500)
    }
  }
}
