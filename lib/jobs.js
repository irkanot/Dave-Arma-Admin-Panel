const events = require('events')
const fs = require('fs')

const defaultFilePath = 'jobs.json'

function Jobs (config) {
  this.filePath = (config.jobs && config.jobs.filePath) || defaultFilePath
  this.jobs = this.load()
  this.markInterruptedJobs()
}

Jobs.prototype = new events.EventEmitter()

Jobs.prototype.load = function () {
  try {
    return JSON.parse(fs.readFileSync(this.filePath))
  } catch (e) {
    return []
  }
}

Jobs.prototype.save = function () {
  const tmpFilePath = this.filePath + '.tmp'

  try {
    fs.writeFileSync(tmpFilePath, JSON.stringify(this.jobs, null, 2))

    try {
      fs.unlinkSync(this.filePath)
    } catch (e) {}

    fs.renameSync(tmpFilePath, this.filePath)
  } catch (err) {
    console.error('Jobs save error: ' + err)
  }
}

Jobs.prototype.all = function () {
  return this.jobs.slice().reverse()
}

Jobs.prototype.markInterruptedJobs = function () {
  let changed = false
  const interruptedStatuses = ['pending', 'running', 'waiting_steam_guard']

  this.jobs.forEach(function (job) {
    if (interruptedStatuses.indexOf(job.status) !== -1) {
      job.status = 'failed'
      job.error = 'Job interrupted by application restart'
      job.finishedAt = new Date().toISOString()
      job.updatedAt = job.finishedAt
      changed = true
    }
  })

  if (changed) {
    this.save()
  }
}

Jobs.prototype.create = function (type, data) {
  const job = {
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    type,
    status: 'pending',
    progress: 0,
    data: data || {},
    log: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  this.jobs.push(job)
  this.save()
  this.emit('jobs', this.all())

  return job
}

Jobs.prototype.appendLog = function (job, message) {
  job.log.push({
    at: new Date().toISOString(),
    message
  })
  job.updatedAt = new Date().toISOString()
  this.save()
  this.emit('jobs', this.all())
}

Jobs.prototype.update = function (job, data) {
  Object.keys(data).forEach(function (key) {
    job[key] = data[key]
  })
  job.updatedAt = new Date().toISOString()
  this.save()
  this.emit('jobs', this.all())
}

Jobs.prototype.run = function (job, runner) {
  const self = this

  this.update(job, {
    status: 'running',
    startedAt: new Date().toISOString()
  })

  runner(job, {
    log: function (message) {
      self.appendLog(job, message)
    },
    progress: function (progress) {
      self.update(job, { progress })
    },
    status: function (status) {
      self.update(job, { status })
    }
  }, function (err, result) {
    if (err) {
      self.appendLog(job, err.message || String(err))
      self.update(job, {
        status: 'failed',
        error: err.message || String(err),
        finishedAt: new Date().toISOString()
      })
      return
    }

    self.update(job, {
      status: 'success',
      progress: 100,
      result: result || {},
      finishedAt: new Date().toISOString()
    })
  })
}

module.exports = Jobs
