const crypto = require('crypto')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const githubUpdateFeed = 'https://github.com/irkanot/Dave-Arma-Admin-Panel/releases/latest/download/latest.json'

function Updates (projectRoot, config) {
  this.projectRoot = projectRoot
  this.config = config || {}
  this.updateFeed = githubUpdateFeed
}

Updates.prototype.releaseDirectory = function () {
  return path.resolve(this.projectRoot, (this.config.updates && this.config.updates.releaseDirectory) || 'Releases')
}

Updates.prototype.feedUrl = function () {
  return this.updateFeed
}

Updates.prototype.currentVersion = function () {
  try {
    return JSON.parse(stripBOM(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'))).version
  } catch (err) {
    return '0.0.0'
  }
}

Updates.prototype.status = function (cb) {
  const self = this
  const currentVersion = this.currentVersion()
  const feedUrl = this.feedUrl()
  if (!feedUrl) {
    return cb(null, { currentVersion, available: false, feedConfigured: false, message: 'Configure the online update feed URL in Settings.' })
  }

  getText(feedUrl, function (err, body) {
    if (err) return cb(null, { currentVersion, available: false, feedConfigured: true, feedUrl, error: err.message })

    let release
    try {
      release = JSON.parse(stripBOM(body))
    } catch (err) {
      return cb(null, { currentVersion, available: false, feedConfigured: true, feedUrl, error: 'Invalid online update manifest' })
    }

    const packageUrl = new URL(release.package, feedUrl).toString()
    cb(null, {
      currentVersion,
      latestVersion: release.version,
      available: compareVersions(release.version, currentVersion) > 0,
      feedConfigured: true,
      manifestFound: true,
      feedUrl,
      packageUrl,
      sha256: release.sha256,
      notes: release.notes || '',
      manifest: release,
      releaseDirectory: self.releaseDirectory()
    })
  })
}

Updates.prototype.download = function (status, cb) {
  const directory = this.releaseDirectory()
  const packageName = path.basename(new URL(status.packageUrl).pathname)
  const packagePath = path.join(directory, packageName)
  const manifestPath = path.join(directory, 'latest.json')
  fs.mkdirSync(directory, { recursive: true })

  downloadFile(status.packageUrl, packagePath + '.download', function (err) {
    if (err) return cb(err)
    const hash = sha256(packagePath + '.download')
    if (hash !== String(status.sha256 || '').toUpperCase()) {
      fs.rmSync(packagePath + '.download', { force: true })
      return cb(new Error('Downloaded update failed SHA256 verification'))
    }
    fs.renameSync(packagePath + '.download', packagePath)
    fs.writeFileSync(manifestPath, JSON.stringify(status.manifest, null, 2), 'utf8')
    cb(null, { packagePath, manifestPath })
  })
}

function getText (url, cb) {
  request(url, function (err, response) {
    if (err) return cb(err)
    let body = ''
    response.setEncoding('utf8')
    response.on('data', function (chunk) { body += chunk })
    response.on('end', function () { cb(null, body) })
  })
}

function downloadFile (url, destination, cb) {
  request(url, function (err, response) {
    if (err) return cb(err)
    const output = fs.createWriteStream(destination)
    response.pipe(output)
    output.on('error', cb)
    output.on('finish', function () { output.close(cb) })
  })
}

function request (url, cb, redirects) {
  redirects = redirects || 0
  if (redirects > 5) return cb(new Error('Too many update feed redirects'))
  let parsed
  try { parsed = new URL(url) } catch (err) { return cb(new Error('Invalid update feed URL')) }
  const client = parsed.protocol === 'https:' ? https : parsed.protocol === 'http:' ? http : null
  if (!client) return cb(new Error('Update feed must use HTTP or HTTPS'))
  const req = client.get(parsed, { headers: { 'User-Agent': 'Arma3-Admin-Updater' } }, function (response) {
    if ([301, 302, 303, 307, 308].indexOf(response.statusCode) !== -1 && response.headers.location) {
      response.resume()
      return request(new URL(response.headers.location, parsed).toString(), cb, redirects + 1)
    }
    if (response.statusCode !== 200) {
      response.resume()
      return cb(new Error('Update server returned HTTP ' + response.statusCode))
    }
    cb(null, response)
  })
  req.setTimeout(15000, function () { req.destroy(new Error('Update server timeout')) })
  req.on('error', cb)
}

function sha256 (file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase()
}

function stripBOM (value) {
  return String(value || '').replace(/^\uFEFF/, '')
}

function compareVersions (left, right) {
  const a = String(left || '').split('.').map(Number)
  const b = String(right || '').split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] || 0) - (b[i] || 0)
    if (difference) return difference
  }
  return 0
}

Updates.compareVersions = compareVersions
module.exports = Updates
