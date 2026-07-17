const https = require('https')

function fetchDisplayName (steamId, cb) {
  if (!steamId) {
    return cb(null, '')
  }

  const req = https.get({
    hostname: 'steamcommunity.com',
    path: '/profiles/' + encodeURIComponent(steamId) + '?xml=1',
    headers: {
      'User-Agent': 'arma-server-web-admin'
    },
    timeout: 5000
  }, function (res) {
    let body = ''

    res.setEncoding('utf8')
    res.on('data', function (chunk) {
      body += chunk
    })
    res.on('end', function () {
      const match = body.match(/<steamID><!\[CDATA\[([\s\S]*?)\]\]><\/steamID>/)
      cb(null, match ? match[1].trim() : '')
    })
  })

  req.on('timeout', function () {
    req.destroy()
  })
  req.on('error', function () {
    cb(null, '')
  })
}

module.exports = {
  fetchDisplayName
}
