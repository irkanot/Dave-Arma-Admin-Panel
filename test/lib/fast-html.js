require('should')

const fastHtml = require('../../lib/mods/fastHtml')

describe('FAST HTML parser', function () {
  it('should extract unique Steam Workshop IDs', function () {
    const ids = fastHtml.parseWorkshopIds([
      '<a href="https://steamcommunity.com/sharedfiles/filedetails/?id=450814997">CBA_A3</a>',
      '<a href="https://steamcommunity.com/workshop/filedetails/?id=463939057">ACE</a>',
      '<a href="https://steamcommunity.com/sharedfiles/filedetails/?id=450814997">Duplicate</a>'
    ].join('\n'))

    ids.should.eql(['450814997', '463939057'])
  })
})
