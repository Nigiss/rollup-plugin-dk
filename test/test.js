var dkPlugin = require('..')
var rollup = require('rollup')
var assert = require('assert')

process.chdir(__dirname)

function formatArray (arr) {
  return arr.sort().join('-')
}

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
        assert.equal(formatArray(fns), formatArray([
          'mod1__fn1',
          'mod2__fn1',
          'mod2__fn2',
          'mod3__fn2',
          'mod5__tpl1',
          'sameNameFn',
          'sameNameFn$1'
        ]))
      })
    })
  })
})
