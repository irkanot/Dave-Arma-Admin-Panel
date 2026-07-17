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
  fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] ' + message + '\r\n')
}

function state (version, status, message, packageName) {
  fs.writeFileSync(statePath, JSON.stringify({ version, status, message, package: packageName, updatedAt: new Date().toISOString() }, null, 2))
}

function copyApplication (source, destination) {
  fs.readdirSync(source, { withFileTypes: true }).forEach(function (entry) {
    if (preserved.has(entry.name) || entry.name === 'node_modules') return
    fs.cpSync(path.join(source, entry.name), path.join(destination, entry.name), { recursive: true, force: true })
  })
}

function run (file, commandArgs, cwd) {
  log('Running: ' + file + ' ' + commandArgs.join(' '))
  const result = spawnSync(file, commandArgs, { cwd, encoding: 'utf8', windowsHide: true })
  if (result.stdout) fs.appendFileSync(logPath, result.stdout)
  if (result.stderr) fs.appendFileSync(logPath, result.stderr)
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(path.basename(file) + ' exited with code ' + result.status)
}

function restartPanel () {
  if (args['no-restart'] === 'true') {
    log('Panel restart skipped by test option')
    return
  }
  log('Restarting panel with ' + process.execPath)
  const child = spawn(process.execPath, ['app.js'], { cwd: installRoot, detached: true, stdio: 'ignore', windowsHide: true })
  child.unref()
}

let manifest
let backupRoot
let stage

try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const packagePath = path.join(path.dirname(manifestPath), path.basename(manifest.package))
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(packagePath)).digest('hex').toUpperCase()
  if (actualHash !== String(manifest.sha256).toUpperCase()) throw new Error('SHA256 verification failed')

  backupRoot = path.join(updateRoot, 'backups', manifest.version + '-' + Date.now())
  stage = path.join(updateRoot, 'staging', crypto.randomBytes(12).toString('hex'))
  fs.mkdirSync(backupRoot, { recursive: true })
  fs.mkdirSync(stage, { recursive: true })
  state(manifest.version, 'running', 'Stopping panel and applying update', manifest.package)

  log('Waiting for HTTP response to be delivered')
  sleep(2500)
  try {
    process.kill(panelPid, 'SIGKILL')
    log('Stopped panel PID ' + panelPid)
  } catch (err) {
    log('Panel PID already stopped: ' + err.message)
  }

  copyApplication(installRoot, backupRoot)
  log('Backup created at ' + backupRoot)

  const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
  run(tar, ['-xf', packagePath, '-C', stage], installRoot)
  if (!fs.existsSync(path.join(stage, 'package.json'))) throw new Error('Package payload is invalid')

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
  if (stage) fs.rmSync(stage, { recursive: true, force: true })
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
