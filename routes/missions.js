const async = require('async')
const express = require('express')
const multer = require('multer')
const path = require('path')
const permissions = require('../lib/security/permissions')

const upload = multer({ storage: multer.diskStorage({}) })

module.exports = function (missionsManager, accessControl, auditLog) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.missions.view), function (req, res) {
    res.json(missionsManager.missions)
  })

  router.post('/bulk-delete', accessControl.requirePermission(permissions.missions.delete), function (req, res) {
    const names = uniqueNames(req.body && req.body.names)
    if (names.length === 0) return res.status(400).send('Select at least one mission')
    if (names.length > 500) return res.status(400).send('A maximum of 500 missions can be deleted at once')

    async.eachLimit(names, 4, function (name, next) {
      missionsManager.delete(name, next)
    }, function (err) {
      if (err) return res.status(500).send(err.message || err)
      auditLog.record(req, 'missions.bulkDelete', { missions: names, count: names.length })
      res.json({ success: true, deleted: names.length })
    })
  })

  router.post('/', accessControl.requirePermission(permissions.missions.upload), upload.array('missions', 64), function (req, res) {
    const missions = req.files.filter(function (file) {
      return path.extname(file.originalname) === '.pbo'
    })

    async.parallelLimit(
      missions.map(function (missionFile) {
        return function (next) {
          missionsManager.handleUpload(missionFile, next)
        }
      }),
      8,
      function (err) {
        if (err) {
          res.status(500).send(err)
        } else {
          auditLog.record(req, 'missions.upload', { count: missions.length })
          res.status(200).json({ success: true })
        }
      }
    )
  })

  router.post('/zip', accessControl.requirePermission(permissions.missions.upload), upload.single('missionZip'), function (req, res) {
    if (!req.file) {
      return res.status(400).send('Mission zip file is required')
    }

    if (path.extname(req.file.originalname).toLowerCase() !== '.zip') {
      return res.status(400).send('Only .zip files are supported')
    }

    missionsManager.handleZipUpload(req.file, function (err, count) {
      if (err) {
        res.status(500).send(err)
      } else {
        auditLog.record(req, 'missions.uploadZip', { count })
        res.status(200).json({ success: true, count })
      }
    })
  })

  router.get('/:mission', accessControl.requirePermission(permissions.missions.view), function (req, res) {
    const filename = req.params.mission

    res.download(missionsManager.missionPath(filename), decodeURI(filename))
  })

  router.delete('/:mission', accessControl.requirePermission(permissions.missions.delete), function (req, res) {
    const filename = req.params.mission

    missionsManager.delete(filename, function (err) {
      if (err) {
        res.status(500).send(err)
      } else {
        auditLog.record(req, 'missions.delete', { mission: filename })
        res.json({ success: true })
      }
    })
  })

  router.post('/refresh', accessControl.requirePermission(permissions.missions.view), function (req, res) {
    missionsManager.updateMissions()
    res.status(204).send()
  })

  router.post('/workshop', accessControl.requirePermission(permissions.missions.upload), function (req, res) {
    res.status(410).send('Workshop mission download was removed with the legacy steam-workshop integration. Upload mission PBO/ZIP files instead.')
  })

  return router
}

function uniqueNames (values) {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values.filter(function (value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 512
  })))
}
