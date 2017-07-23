/* global include */
/* eslint-disable no-unused-vars, camelcase */

include([
  './lib/mod3.js'
])

/* exported mod2__fn2 */

function sameNameFn () {}

function mod2__fn1 () {
  return ''
}

function mod2__fn2 () {
  return mod2__fn1() + sameNameFn()
}
