const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const addDevServerEntrypoints = require('webpack-dev-server/lib/util/addDevServerEntrypoints')
const createDomain = require('webpack-dev-server/lib/util/createDomain')
const chalk = require('chalk')
const dotenv = require('dotenv')
const findUp = require('find-up')
const statTable = require('./stat-table')

const webpackConfig = require('./webpack/config')
const deployFiles = require('./deploy')

const [command] = process.argv.slice(2)

async function createWebpackConfig() {
  const [config, devServer] = await webpackConfig()
  if (process.env.NODE_ENV === 'development') {
    addDevServerEntrypoints(config, devServer)
  }
  const compiler = webpack(config)
  return { compiler, devServer }
}

async function dev() {
  try {
    await verifyWordPress()
    startWebpackDevServer(await createWebpackConfig())
  } catch (err) {
    console.error(chalk.red(err))
  }
}

async function verifyWordPress() {
  if (!await findUp('web/wp/index.php')) {
    return
  }

  const env = await findUp('.env')

  if (env) {
    // A shallow copy isn't an issue in this case, it's a good thing
    const before = Object.assign({}, process.env)

    // Load everything from .env into the process
    dotenv.config()

    const WP_ENV = process.env.WP_ENV

    // Reset the environment variables in the process back to what they were before
    process.env = before

    if (WP_ENV && WP_ENV !== 'development') {
      throw new Error(
        'WP_ENV is defined (=' +
          WP_ENV +
          ') but should be "development" for the Aviate WordPress plugin to work.'
      )
    }
  }
}

function startWebpackDevServer({ compiler, devServer }) {
  try {
    const server = new WebpackDevServer(compiler, devServer)
    server
      .listen(devServer.port, '127.0.0.1', () => {
        console.log(chalk.green(`Started server on ${createDomain(devServer)}`))
        console.log(chalk.yellow('Compiling...'))
      })
      .on('error', err => {
        if (err.code === 'EADDRINUSE') {
          console.error(
            `Port ${devServer.port} is already in use. You are most likely running another instance of Aviate.`
          )
          process.exit(0)
          return
        }

        console.error(chalk.red(err))
      })
  } catch (err) {
    console.error(chalk.red(err))
  }
}

async function build() {
  const { compiler } = await createWebpackConfig()
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err)
      }

      resolve(stats)
    })
  })
}

module.exports = async function() {
  if (!command || command === 'dev') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development'
    return dev()
  }

  if (command === 'build') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production'
    try {
      console.log('Building project...')
      const stats = await build()
      statTable(stats)
      console.log('Copying files...')
      await deployFiles()
      console.log('Deployed files')
    } catch (err) {
      console.error(err.message)
    }
  }
}
