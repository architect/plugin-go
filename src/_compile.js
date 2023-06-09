let { join } = require('path')
let { rm } = require('fs/promises')
let { spawn } = require('child_process')
let minimist = require('minimist')
let isWin = process.platform.startsWith('win')

async function compileProject ({ inventory }) {
  let { inv } = inventory

  let start = Date.now()
  let ok = true
  console.log(`Compiling Go`)

  async function go (lambda) {
    if (lambda.config.runtime !== 'lambda-go') return
    try {
      await compileHandler({ inventory, lambda })
    }
    catch (err) {
      ok = false
      console.log(`Go compilation error:`, err)
    }
  }
  let compiles = Object.values(inv.lambdasBySrcDir).map(go)
  await Promise.allSettled(compiles)
  if (ok) console.log(`Compiled project in ${(Date.now() - start) / 1000}s`)
}

async function compileHandler (params) {
  let { inventory, lambda } = params
  let { deployStage: stage } = inventory.inv._arc
  let { arc } = inventory.inv._project
  let { build, src } = lambda
  stage = stage || 'testing'
  let arch = lambda.config.architecture === 'arm64' ? 'arm64' : 'amd64'

  let useWin = isWin && stage === 'testing'
  let bootstrap = join(build, `bootstrap${useWin ? '.exe' : ''}`)
  let command = `go get && go build -o ${bootstrap} main.go`
  if (arc.go) {
    let settings = Object.fromEntries(arc.go)
    if (settings?.customCommand?.[stage]) {
      command = settings.customCommand[stage]
    }
  }

  console.log(`Compiling handler: @${lambda.pragma} ${lambda.name}`)
  let alias = {
    debug: [ 'd' ],
    verbose: [ 'v' ],
  }
  let args = minimist(process.argv.slice(2), { alias })
  let isVerbose = args.verbose || args.debug

  await rm(build, { recursive: true, force: true })

  let cmdArgs = command.split(' ').filter(Boolean)
  let cmd = cmdArgs.shift()

  // Run the build
  return new Promise((res, rej) => {
    let env = { ...process.env }
    if (stage !== 'testing') {
      env.GOOS = 'linux'
      env.GOARCH = arch
    }
    let child = spawn(cmd, cmdArgs, {
      cwd: src,
      shell: true,
      env,
    })
    let buf = []
    child.stdout.on('data', data => {
      buf.push(data)
      if (isVerbose) process.stdout.write(data)
    })
    child.stderr.on('data', data => {
      buf.push(data)
      if (isVerbose) process.stderr.write(data)
    })
    child.on('error', rej)
    child.on('close', code => {
      if (code) {
        console.log(buf.toString())
        rej()
      }
      else res()
    })
  })
}

module.exports = {
  compileHandler,
  compileProject,
}
