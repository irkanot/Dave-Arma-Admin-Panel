const fs = require('fs')
const os = require('os')
const path = require('path')
const spawnSync = require('child_process').spawnSync

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
  const target = path.resolve(root || process.cwd())
  try {
    if (typeof fs.statfsSync !== 'function') throw new Error('fs.statfsSync is unavailable')
    const disk = fs.statfsSync(target)
    const total = disk.blocks * disk.bsize
    const available = disk.bavail * disk.bsize
    if (!Number.isFinite(total) || total <= 0) throw new Error('Filesystem returned an invalid capacity')
    return { total, used: total - available, available, source: 'node' }
  } catch (err) {
    if (process.platform === 'win32') return windowsDiskUsage(target, err)
    return { total: 0, used: 0, available: 0, error: err.message }
  }
}

function windowsDiskUsage (target, originalError) {
  const drive = path.parse(target).root.replace(/[\\/]+$/, '')
  const script = "$d=Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='" + drive.replace(/'/g, "''") + "'\"; if($d){$d.Size.ToString()+'|'+$d.FreeSpace.ToString()}"
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000
  })
  const values = String(result.stdout || '').trim().split('|').map(Number)
  if (result.status === 0 && values.length === 2 && values.every(Number.isFinite) && values[0] > 0) {
    return { total: values[0], used: values[0] - values[1], available: values[1], source: 'powershell' }
  }
  const detail = result.error ? result.error.message : String(result.stderr || '').trim()
  return { total: 0, used: 0, available: 0, error: detail || originalError.message }
}

module.exports = function (installRoot) {
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const cpus = os.cpus()
  return {
    cpu: { usage: cpuUsage(), cores: cpus.length },
    memory: { total: totalMemory, used: totalMemory - freeMemory, available: freeMemory },
    disk: diskUsage(path.parse(installRoot).root),
    uptime: os.uptime(),
    panel: { uptime: process.uptime(), memory: process.memoryUsage().rss },
    platform: os.platform(),
    hostname: os.hostname(),
    measuredAt: new Date().toISOString()
  }
}
