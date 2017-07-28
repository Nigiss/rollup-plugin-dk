/* global include */
/* eslint-disable no-unused-vars, camelcase */

include([
  '../lib/mod3.js'
])

/* public mod1__fn1 */
/* exported mod1__fn2 */

function sameNameFn () {}

function mod1__fn1 () {
  return sameNameFn()
}

function mod1__fn2 () {
  return ''
}
