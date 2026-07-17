const express = require('express')
const permissions = require('../lib/security/permissions')

module.exports = function (logsManager, accessControl, auditLog) {
  const router = express.Router()

  router.get('/', accessControl.requirePermission(permissions.logs.view), function (req, res) {
    logsManager.logFiles(function (err, files) {
      if (err) {
        res.status(500).send(err)
      } else {
        res.json(files)
      }
    })
  })

  router.delete('/:log', accessControl.requirePermission(permissions.logs.delete), function (req, res) {
    const filename = req.params.log
    logsManager.delete(filename, function (err) {
      if (err) {
        res.status(500).send(err)
      } else {
        auditLog.record(req, 'logs.delete', { log: filename })
        res.status(204).send()
      }
    })
  })

  router.get('/:log/:mode', accessControl.requirePermission(permissions.logs.view), function (req, res) {
    const requestedFilename = req.params.log
    const mode = req.params.mode === 'view' ? 'view' : 'download'

    logsManager.getLogFile(requestedFilename, function (err, file) {
      if (err) {
        res.status(500).send(err)
      } else {
        if (file) {
          if (mode === 'download') {
            res.download(file.path)
          } else {
            logsManager.readLogFile(file.path, function (err, data) {
              if (err) {
                return res.status(500).send(err)
              }
              res.contentType('text/plain')
              res.send(data)
            })
          }
        } else {
          res.status(404).send(new Error('File not found'))
        }
      }
    })
  })

  return router
}
