const { chromium } = require('playwright')
const { spawn } = require('child_process')
const http = require('http')

const baseUrl = 'http://127.0.0.1:3000'

function waitForServer (deadline, cb) {
  const req = http.get(baseUrl + '/api/me', function (res) {
    res.resume()
    cb()
  })

  req.on('error', function (err) {
    if (Date.now() > deadline) {
      cb(err)
      return
    }

    setTimeout(function () {
      waitForServer(deadline, cb)
    }, 250)
  })
}

function isServerUp (cb) {
  const req = http.get(baseUrl + '/api/me', function (res) {
    res.resume()
    cb(null, true)
  })

  req.on('error', function () {
    cb(null, false)
  })
}

function startApp () {
  return spawn(process.execPath, ['app.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

async function run () {
  const alreadyRunning = await new Promise(function (resolve) {
    isServerUp(function (_err, running) {
      resolve(running)
    })
  })
  const app = alreadyRunning ? null : startApp()
  let browser
  let output = ''

  if (app) {
    app.stdout.on('data', function (chunk) {
      output += chunk.toString()
    })
    app.stderr.on('data', function (chunk) {
      output += chunk.toString()
    })
  }

  try {
    await new Promise(function (resolve, reject) {
      waitForServer(Date.now() + 15000, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })

    browser = await chromium.launch()
    const page = await browser.newPage()
    const errors = []

    page.on('pageerror', function (err) {
      errors.push(err.message)
    })
    page.on('console', function (message) {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })

    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.locator('h1', { hasText: 'Login required' }).waitFor({ timeout: 10000 })
    await page.locator('#login-steam').waitFor({ timeout: 10000 })
    await page.locator('#content a[href="/auth/steam"]', { hasText: 'Sign in with Steam' }).waitFor()

    if (errors.length > 0) {
      throw new Error(errors.join('\n'))
    }

    if (output.toLowerCase().indexOf('eaddrinuse') !== -1) {
      throw new Error(output)
    }
  } finally {
    if (browser) {
      await browser.close()
    }

    if (app) {
      app.kill()
      await new Promise(function (resolve) {
        app.on('close', resolve)
        setTimeout(resolve, 1000)
      })
    }
  }
}

if (require.main === module) {
  run().catch(function (err) {
    console.error(err)
    process.exit(1)
  })
}
