const async = require('async')
const armaClassParser = require('arma-class-parser')
const fs = require('fs.extra')
const path = require('path')
const spawn = require('child_process').spawn

function steamCmdConfig (config) {
  return config.steamCmd || {}
}

function executablePath (config) {
  const executable = steamCmdConfig(config).executable || ''

  if (!executable) {
    return ''
  }

  try {
    const stat = fs.statSync(executable)
    if (stat.isDirectory()) {
      return path.join(executable, process.platform === 'win32' ? 'steamcmd.exe' : 'steamcmd.sh')
    }
  } catch (e) {}

  return executable
}

function downloadPath (config) {
  return steamCmdConfig(config).downloadPath || path.join(config.path, '_steamcmd_workshop')
}

function workshopItemPath (config, workshopId) {
  return path.join(downloadPath(config), 'steamapps', 'workshop', 'content', '107410', workshopId)
}

function deployedModPath (config, workshopId) {
  return path.join(config.path, '@workshop_' + workshopId)
}

function deployedNamedModPath (config, source, workshopId) {
  return path.join(config.path, modFolderName(source, workshopId))
}

function runSteamCmd (config, workshopIds, reporter, cb) {
  const executable = executablePath(config)
  const steamCmd = steamCmdConfig(config)

  if (!executable) {
    return cb(new Error('SteamCMD executable is not configured'))
  }

  const loginArgs = buildLoginArgs(steamCmd)
  const workshopArgs = []

  workshopIds.forEach(function (workshopId) {
    workshopArgs.push('+workshop_download_item', '107410', workshopId, 'validate')
  })

  const args = [
    '+force_install_dir', downloadPath(config),
    ...loginArgs,
    ...workshopArgs,
    '+quit'
  ]

  reporter.log('Downloading ' + workshopIds.length + ' Workshop item(s) in one SteamCMD session')

  runSteamCmdProcess(executable, args, reporter, function (err, output) {
    if (err) {
      return cb(new Error('SteamCMD failed\n' + output))
    }

    cb()
  })
}

function buildLoginArgs (steamCmd) {
  const loginArgs = ['+login', steamCmd.username || 'anonymous']

  if (steamCmd.password) {
    loginArgs.push(steamCmd.password)
  }

  if (steamCmd.steamGuardCode) {
    loginArgs.push(steamCmd.steamGuardCode)
  }

  return loginArgs
}

function runSteamCmdProcess (executable, args, reporter, cb) {
  const child = spawn(executable, args)
  let output = ''
  let steamGuardLogged = false

  function captureOutput (chunk) {
    const text = chunk.toString()
    output += text

    if (text.indexOf('Please confirm the login in the Steam Mobile app') !== -1 && !steamGuardLogged) {
      steamGuardLogged = true
      reporter.status('waiting_steam_guard')
      reporter.log('Steam Guard confirmation required: open the Steam mobile app and approve the login.')
    }

    if (text.indexOf('Waiting for confirmation') !== -1) {
      reporter.status('waiting_steam_guard')
    }
  }

  child.stdout.on('data', function (chunk) {
    captureOutput(chunk)
  })
  child.stderr.on('data', function (chunk) {
    captureOutput(chunk)
  })
  child.on('error', cb)
  child.on('close', function (code) {
    if (code !== 0) {
      return cb(new Error('SteamCMD exited with code ' + code), output)
    }

    cb(null, output)
  })
}

function login (config, reporter, cb) {
  const executable = executablePath(config)
  const steamCmd = steamCmdConfig(config)

  if (!executable) {
    return cb(new Error('SteamCMD executable is not configured'))
  }

  reporter.log('Starting SteamCMD login')

  runSteamCmdProcess(executable, buildLoginArgs(steamCmd).concat(['+quit']), reporter, function (err, output) {
    if (err) {
      return cb(new Error('SteamCMD login failed\n' + output))
    }

    cb(null, { username: steamCmd.username || 'anonymous' })
  })
}

function parseClassFileName (filePath) {
  const meta = parseClassFile(filePath)
  return meta.name || ''
}

function parseClassFileId (filePath) {
  const meta = parseClassFile(filePath)
  return meta.publishedid ? String(meta.publishedid) : ''
}

function parseClassFile (filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return armaClassParser.parse(stripBOM(data))
  } catch (err) {
    return {}
  }
}

function stripBOM (data) {
  if (data.charCodeAt(0) === 0xFEFF) {
    return data.slice(1)
  }

  return data
}

function modFolderName (source, workshopId) {
  const metadataName = parseClassFileName(path.join(source, 'meta.cpp')) || parseClassFileName(path.join(source, 'mod.cpp'))
  const fallback = 'workshop_' + workshopId
  let name = metadataName || fallback

  name = name.replace(/^@+/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!name) {
    name = fallback
  }

  return '@' + name.slice(0, 96)
}

function installedWorkshopIds (config) {
  const installed = {}
  let names = []

  try {
    names = fs.readdirSync(config.path)
  } catch (err) {
    return installed
  }

  names.forEach(function (name) {
    if (name.charAt(0) !== '@' || name.indexOf('@workshop_') === 0) {
      return
    }

    const fullPath = path.join(config.path, name)
    if (isBrokenLink(fullPath)) {
      return
    }

    const metaId = parseClassFileId(path.join(fullPath, 'meta.cpp'))
    const linkId = linkTargetWorkshopId(fullPath)
    const id = metaId || linkId

    if (id) {
      installed[id] = name
    }
  })

  return installed
}

function isBrokenLink (fullPath) {
  try {
    const stat = fs.lstatSync(fullPath)
    if (!stat.isSymbolicLink()) {
      return false
    }

    return !fs.existsSync(fs.readlinkSync(fullPath))
  } catch (err) {
    return true
  }
}

function linkTargetWorkshopId (fullPath) {
  try {
    const stat = fs.lstatSync(fullPath)
    if (!stat.isSymbolicLink()) {
      return ''
    }

    const target = fs.readlinkSync(fullPath)
    if (!fs.existsSync(target)) {
      return ''
    }

    const id = path.basename(target)
    return /^\d+$/.test(id) ? id : ''
  } catch (err) {
    return ''
  }
}

function deployWorkshopItem (config, workshopId, reporter, cb) {
  const source = workshopItemPath(config, workshopId)

  if (!fs.existsSync(source)) {
    return cb(new Error('SteamCMD did not download Workshop item ' + workshopId + '. Arma 3 Workshop usually requires a Steam account that owns Arma 3; anonymous login returned no deployable files.'))
  }

  const destination = deployedNamedModPath(config, source, workshopId)
  reporter.log('Deploying Workshop item ' + workshopId + ' to ' + destination)

  fs.rmrf(destination, function (err) {
    if (err) {
      return cb(err)
    }

    fs.copyRecursive(source, destination, cb)
  })
}

function importWorkshopIds (config, workshopIds, reporter, cb) {
  if (!Array.isArray(workshopIds) || workshopIds.length === 0) {
    return cb(new Error('No Workshop IDs to import'))
  }

  const installed = installedWorkshopIds(config)
  workshopIds.forEach(function (workshopId) {
    if (installed[workshopId]) {
      reporter.log('Validating installed Workshop item ' + workshopId + ' (' + installed[workshopId] + ')')
    }
  })
  const idsToDownload = workshopIdsForValidation(workshopIds)

  fs.mkdirp(downloadPath(config), function (err) {
    if (err) {
      return cb(err)
    }

    runSteamCmd(config, idsToDownload, reporter, function (err) {
      if (err) {
        return cb(err)
      }

      async.eachOfSeries(idsToDownload, function (workshopId, index, next) {
        reporter.log('Preparing Workshop item ' + workshopId)
        deployWorkshopItem(config, workshopId, reporter, function (err) {
          if (err) {
            return next(err)
          }

          reporter.progress(Math.round(((index + 1) / idsToDownload.length) * 100))
          next()
        })
      }, function (err) {
        cb(err, {
          workshopIds,
          skipped: [],
          deployedMods: idsToDownload.map(function (workshopId) {
            const source = workshopItemPath(config, workshopId)
            return modFolderName(source, workshopId)
          })
        })
      })
    })
  })
}

function workshopIdsForValidation (workshopIds) {
  return workshopIds.slice()
}

module.exports = {
  deployedModPath,
  deployedNamedModPath,
  downloadPath,
  executablePath,
  importWorkshopIds,
  idsToDownload: workshopIdsForValidation,
  installedWorkshopIds,
  login,
  modFolderName,
  workshopItemPath
}
