'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const spawnSync = require('child_process').spawnSync

const args = parseArgs(process.argv.slice(2))
const installRoot = path.resolve(required('root'))
const manifestPath = path.resolve(required('manifest'))
const panelPid = Number(required('pid'))
const updateRoot = path.join(installRoot, '.updates')
const statePath = path.join(updateRoot, 'current.json')
const logPath = path.join(updateRoot, 'update.log')
const preserved = new Set(['config.js', 'settings.json', 'servers.json', 'users.json', 'roles.json', 'jobs.json', 'audit.json', 'Releases', '.updates'])

fs.mkdirSync(updateRoot, { recursive: true })

function log (message) {
  const line = '[' + new Date().toISOString() + '] ' + message
  fs.appendFileSync(logPath, line + '\r\n')
  console.log(line)
}

function state (version, status, message, packageName) {
  fs.writeFileSync(statePath, JSON.stringify({ version, status, message, package: packageName, updatedAt: new Date().toISOString() }, null, 2))
}

function copyApplication (source, destination) {
  log('Copying application files from ' + source + ' to ' + destination)
  let copied = 0
  fs.readdirSync(source, { withFileTypes: true }).forEach(function (entry) {
    if (preserved.has(entry.name) || entry.name === 'node_modules') return
    fs.cpSync(path.join(source, entry.name), path.join(destination, entry.name), { recursive: true, force: true })
    copied++
  })
  log('Application copy completed: ' + copied + ' top-level entries copied')
}

function run (file, commandArgs, cwd) {
  log('Running: ' + file + ' ' + commandArgs.join(' '))
  const result = spawnSync(file, commandArgs, { cwd, encoding: 'utf8', windowsHide: false })
  if (result.stdout) {
    fs.appendFileSync(logPath, result.stdout)
    process.stdout.write(result.stdout)
  }
  if (result.stderr) {
    fs.appendFileSync(logPath, result.stderr)
    process.stderr.write(result.stderr)
  }
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(path.basename(file) + ' exited with code ' + result.status)
  log(path.basename(file) + ' completed successfully with exit code 0')
}

function isProcessRunning (pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return false
  }
}

function stopAndVerifyPanel (pid) {
  log('Checking panel PID ' + pid + ' before termination: ' + (isProcessRunning(pid) ? 'RUNNING' : 'NOT RUNNING'))
  if (!isProcessRunning(pid)) {
    log('Panel PID ' + pid + ' was already stopped')
    return
  }

  const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe')
  // Do not use /T here: the updater itself was launched by the panel and can
  // still appear as its descendant in the Windows process tree.
  log('Requesting forced termination of panel PID ' + pid)
  const result = spawnSync(taskkill, ['/PID', String(pid), '/F'], { encoding: 'utf8', windowsHide: false })
  if (result.stdout) log('taskkill stdout: ' + result.stdout.trim())
  if (result.stderr) log('taskkill stderr: ' + result.stderr.trim())
  if (result.error) throw result.error
  if (result.status !== 0 && isProcessRunning(pid)) throw new Error('taskkill exited with code ' + result.status)

  const deadline = Date.now() + 10000
  while (isProcessRunning(pid) && Date.now() < deadline) sleep(250)
  if (isProcessRunning(pid)) throw new Error('Panel PID ' + pid + ' is still running after taskkill and 10 seconds of verification')
  log('VERIFIED: panel PID ' + pid + ' is no longer running')
}

function restartPanel () {
  if (args['no-restart'] === 'true') {
    log('Panel restart skipped by test option')
    return
  }
  log('Restarting panel with visible Node console: ' + process.execPath)
  const child = spawn(process.execPath, ['app.js'], { cwd: installRoot, detached: true, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: false })
  log('Restarted panel process with PID ' + child.pid)
  child.unref()
}

let manifest
let backupRoot
let stage

try {
  log('============================================================')
  log('External updater started; updater PID ' + process.pid)
  log('Install root: ' + installRoot)
  log('Manifest path: ' + manifestPath)
  log('Panel PID received: ' + panelPid)
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  log('Manifest loaded for version ' + manifest.version + ', package ' + manifest.package)
  const packagePath = path.join(path.dirname(manifestPath), path.basename(manifest.package))
  log('Calculating SHA256 for ' + packagePath)
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(packagePath)).digest('hex').toUpperCase()
  if (actualHash !== String(manifest.sha256).toUpperCase()) throw new Error('SHA256 verification failed')
  log('SHA256 verified: ' + actualHash)

  backupRoot = path.join(updateRoot, 'backups', manifest.version + '-' + Date.now())
  stage = path.join(updateRoot, 'staging', crypto.randomBytes(12).toString('hex'))
  fs.mkdirSync(backupRoot, { recursive: true })
  fs.mkdirSync(stage, { recursive: true })
  state(manifest.version, 'running', 'Stopping panel and applying update', manifest.package)

  log('Waiting for HTTP response to be delivered')
  sleep(2500)
  stopAndVerifyPanel(panelPid)

  copyApplication(installRoot, backupRoot)
  log('Backup created at ' + backupRoot)

  const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
  run(tar, ['-xf', packagePath, '-C', stage], installRoot)
  if (!fs.existsSync(path.join(stage, 'package.json'))) throw new Error('Package payload is invalid')
  log('Package extracted and payload structure verified')

  copyApplication(stage, installRoot)
  const cmd = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
  run(cmd, ['/d', '/s', '/c', 'npm ci --no-audit --no-fund'], installRoot)

  state(manifest.version, 'installed', 'Update installed successfully', manifest.package)
  log('Update ' + manifest.version + ' installed successfully')
  restartPanel()
} catch (err) {
  log('FAILED: ' + (err.stack || err.message))
  if (manifest) state(manifest.version, 'failed', err.message, manifest.package)
  if (backupRoot && fs.existsSync(path.join(backupRoot, 'package.json'))) {
    try {
      copyApplication(backupRoot, installRoot)
      log('Rollback completed')
    } catch (rollbackError) {
      log('ROLLBACK FAILED: ' + rollbackError.stack)
    }
  }
  restartPanel()
  process.exitCode = 1
} finally {
  if (stage) {
    log('Removing staging directory ' + stage)
    fs.rmSync(stage, { recursive: true, force: true })
  }
  log('Updater finished with exit code ' + (process.exitCode || 0))
}

function parseArgs (values) {
  const parsed = {}
  for (let index = 0; index < values.length; index += 2) parsed[values[index].replace(/^--/, '')] = values[index + 1]
  return parsed
}

function required (name) {
  if (!args[name]) throw new Error('Missing --' + name)
  return args[name]
}

function sleep (milliseconds) {
  const buffer = new SharedArrayBuffer(4)
  Atomics.wait(new Int32Array(buffer), 0, 0, milliseconds)
}
