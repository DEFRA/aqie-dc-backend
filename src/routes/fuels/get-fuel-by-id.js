/**
 * Get fuel by ID
 */
//ulysses code that i will use as inspo
// import Joi from 'joi'
// import * as fuelController from '../../controllers/fuel-controller.js'
//
// export const getFuelById = {
//   method: 'GET',
//   path: '/api/fuels/{fuelId}',
//   options: {
//     validate: {
//       params: Joi.object({
//         fuelId: Joi.string().required()
//       })
//     }
//   },
//   handler: async (request, h) => {
//     const { fuelId } = request.params
//
//     try {
//       const result = await fuelController.findFuel(request.db, fuelId)
//
//       if (!result) {
//         return h.response({ message: 'Fuel not found' }).code(404)
//       }
//
//       return h.response({ msg: 'OK', data: result }).code(200)
//     } catch (error) {
//       return h
//         .response({
//           success: false,
//           message: 'Failed to fetch fuel',
//           error: error.message
//         })
//         .code(500)
//     }
//   }
// }
