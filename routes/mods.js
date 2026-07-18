const express = require('express')
const fs = require('fs')
const multer = require('multer')
const async = require('async')
const permissions = require('../lib/security/permissions')
const fastHtml = require('../lib/mods/fastHtml')
const steamcmdImporter = require('../lib/mods/steamcmdImporter')

const upload = multer({ storage: multer.diskStorage({}) })

module.exports = function (modsManager, accessControl, auditLog, jobs) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.mods.view), function (req, res) {
    res.send(modsManager.mods)
  })

  router.post('/bulk-delete', accessControl.requirePermission(permissions.mods.delete), function (req, res) {
    const names = uniqueNames(req.body && req.body.names)
    if (names.length === 0) return res.status(400).send('Select at least one mod')
    if (names.length > 500) return res.status(400).send('A maximum of 500 mods can be deleted at once')

    async.eachLimit(names, 4, function (name, next) {
      modsManager.delete(name, next)
    }, function (err) {
      if (err) return res.status(500).send(err.message || err)
      auditLog.record(req, 'mods.bulkDelete', { mods: names, count: names.length })
      res.json({ success: true, deleted: names.length })
    })
  })

  router.delete('/:mod', accessControl.requirePermission(permissions.mods.delete), function (req, res) {
    modsManager.delete(req.params.mod, function (err) {
      if (err) {
        res.status(500).send(err)
      } else {
        auditLog.record(req, 'mods.delete', { mod: req.params.mod })
        res.status(204).send()
      }
    })
  })

  router.post('/refresh', accessControl.requirePermission(permissions.mods.view), function (req, res) {
    modsManager.updateMods()
    res.status(204).send()
  })

  router.post('/update-workshop', accessControl.requirePermission(permissions.mods.import), function (req, res) {
    const workshopIds = Object.keys(steamcmdImporter.installedWorkshopIds(modsManager.config))
    if (workshopIds.length === 0) {
      return res.status(400).send('No installed Workshop mods with a valid published ID were found')
    }

    const job = jobs.create('mods.updateWorkshop', { workshopIds })
    jobs.run(job, function (job, reporter, done) {
      reporter.log('Checking and validating ' + workshopIds.length + ' installed Workshop mod(s)')
      steamcmdImporter.importWorkshopIds(modsManager.config, workshopIds, reporter, function (err, result) {
        if (!err) {
          modsManager.updateMods()
        }
        done(err, result)
      })
    })

    auditLog.record(req, 'mods.updateWorkshop', { job: job.id, count: workshopIds.length })
    res.status(202).json(job)
  })

  router.post('/import-html', accessControl.requirePermission(permissions.mods.import), upload.single('presetHtml'), function (req, res) {
    if (!req.file) {
      return res.status(400).send('HTML preset file is required')
    }

    const job = jobs.create('mods.importHtml', {
      filename: req.file.originalname
    })

    jobs.run(job, function (job, reporter, done) {
      reporter.log('Reading HTML preset')

      fs.readFile(req.file.path, 'utf8', function (err, html) {
        fs.unlink(req.file.path, function () {})

        if (err) {
          return done(err)
        }

        const workshopIds = fastHtml.parseWorkshopIds(html)
        reporter.log('Found ' + workshopIds.length + ' Workshop item(s)')

        if (workshopIds.length === 0) {
          return done(new Error('No Steam Workshop IDs found in HTML preset'))
        }

        steamcmdImporter.importWorkshopIds(modsManager.config, workshopIds, reporter, function (err, result) {
          if (!err) {
            modsManager.updateMods()
          }

          done(err, result)
        })
      })
    })

    auditLog.record(req, 'mods.importHtml', { job: job.id, filename: req.file.originalname })
    res.status(202).json(job)
  })

  return router
}

function uniqueNames (values) {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values.filter(function (value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 512
  })))
}
