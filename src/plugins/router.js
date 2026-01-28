import { health } from '../routes/health.js'
import { example } from '../routes/example.js'
import { test } from '../dc/routes/test.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      const testRoutes = [test]
      const routes = [health].concat(example).concat(testRoutes)
      server.route(routes)
    }
  }
}

export { router }
