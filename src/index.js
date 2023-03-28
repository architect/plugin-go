let {
  compileProject,
  compileHandler,
} = require('./_compile')

module.exports = {
  set: {
    runtimes: function ({ inventory }) {
      let { arc } = inventory.inv._project

      let build = '.build'
      // Default to provided.al2, but allow for go1.x
      let baseRuntime = 'provided.al2'
      if (arc.rust) {
        let settings = Object.fromEntries(arc.rust)
        if (settings.build && typeof settings.build === 'string') {
          build = settings.build
        }
        if (settings.baseRuntime && settings.baseRuntime === 'go1.x') {
          baseRuntime = settings.baseRuntime
        }
      }

      return {
        name: 'lambda-go',
        type: 'compiled',
        build,
        baseRuntime,
      }
    }
  },
  deploy: {
    start: compileProject
  },
  sandbox: {
    start: compileProject,
    watcher: async function (params) {
      let { filename, /* event, */ inventory } = params
      if (filename.endsWith('.go')) {
        let { lambdasBySrcDir } = inventory.inv

        // Second pass filter by Lambda dir
        let lambda = Object.values(lambdasBySrcDir).find(({ src }) => filename.startsWith(src))

        if (!lambda) { return }

        let start = Date.now()
        let { name, pragma } = lambda
        console.log(`Recompiling handler: @${pragma} ${name}`)
        try {
          await compileHandler({ inventory, lambda })
          console.log(`Compiled in ${(Date.now() - start) / 1000}s\n`)
        }
        catch (err) {
          console.log('Go compilation error:', err)
        }
      }
    }
  },
}
