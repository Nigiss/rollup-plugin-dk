import mod4 from '../mod4-es6'

/* global include */
/* global mod1__fn1 */
/* global mod2__fn2 */
/* global mod5__tpl1 */

include([
  'mod1.js',
  '../mod2.js',
  '../mod5-tpl.js'
])

/* exported entry */

export default function () {
  return mod1__fn1() + mod2__fn2() + mod4() + mod5__tpl1()
}
