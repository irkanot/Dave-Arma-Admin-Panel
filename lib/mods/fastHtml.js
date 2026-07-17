function unique (values) {
  return values.filter(function (value, index) {
    return values.indexOf(value) === index
  })
}

function parseWorkshopIds (html) {
  const ids = []
  const patterns = [
    /steamcommunity\.com\/sharedfiles\/filedetails\/\?id=(\d+)/gi,
    /steamcommunity\.com\/workshop\/filedetails\/\?id=(\d+)/gi,
    /(?:^|[?&])id=(\d{5,})/gi
  ]

  patterns.forEach(function (pattern) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      ids.push(match[1])
    }
  })

  return unique(ids)
}

module.exports = {
  parseWorkshopIds
}
