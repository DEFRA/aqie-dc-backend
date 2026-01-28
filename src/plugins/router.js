import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import importRoute from '../routes/import.js'
import { adminImport } from '../routes/admin-import.js'

const router = {
  plugin: {
    name: 'router',
    register: async (server, _options) => {
      // Register import route plugin
      await server.register(importRoute)

      // Register other routes
      server.route([health].concat(example).concat(adminImport))
    }
  }
}

export { router }
