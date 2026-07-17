const fs = require('fs')
const os = require('os')
const path = require('path')

let previousCpu = cpuTimes()

function cpuTimes () {
  return os.cpus().reduce(function (result, cpu) {
    const times = cpu.times
    result.idle += times.idle
    result.total += times.user + times.nice + times.sys + times.idle + times.irq
    return result
  }, { idle: 0, total: 0 })
}

function cpuUsage () {
  const current = cpuTimes()
  const idle = current.idle - previousCpu.idle
  const total = current.total - previousCpu.total
  previousCpu = current
  return total > 0 ? Math.max(0, Math.min(100, Math.round((1 - idle / total) * 1000) / 10)) : 0
}

function diskUsage (root) {
  try {
    const disk = fs.statfsSync(root)
    const total = disk.blocks * disk.bsize
    const available = disk.bavail * disk.bsize
    return { total, used: total - available, available }
  } catch (err) {
    return { total: 0, used: 0, available: 0 }
  }
}

module.exports = function (installRoot) {
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  return {
    cpu: { usage: cpuUsage(), cores: os.cpus().length },
    memory: { total: totalMemory, used: totalMemory - freeMemory, available: freeMemory },
    disk: diskUsage(path.parse(installRoot).root),
    uptime: os.uptime(),
    panel: { uptime: process.uptime(), memory: process.memoryUsage().rss },
    platform: os.platform(),
    hostname: os.hostname(),
    measuredAt: new Date().toISOString()
  }
}
