var dkPlugin = require('..')
var rollup = require('rollup')
var assert = require('assert')

process.chdir(__dirname)

describe('rollup-plugin-dk', () => {
  it('transform', () => {
    return rollup.rollup({
      entry: './samples/app/index.js',
      plugins: [ dkPlugin() ]
    }).then(bundle => {
      var generated = bundle.generate()
      return generated.then(({ code }) => {
        var fnsReg = /^function\s+([\w$]+)/
        var fns = code.match(new RegExp(fnsReg, 'mg')).map(m => {
          return m.match(fnsReg)[1]
        })
        assert.equal(fns.sort().join('-'), [ 'mod1__fn1', 'mod2__fn1', 'mod2__fn2', 'mod3__fn2', 'sameNameFn', 'sameNameFn$1' ].sort().join('-'))
      })
    })
  })
})
