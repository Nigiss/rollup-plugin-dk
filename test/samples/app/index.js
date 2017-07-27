import mod4 from '../mod4-es6'

/* global include */
/* global mod1__fn1 */
/* global mod2__fn2 */
/* global mod5__tpl1 */
/* global mod7__fn1 */
/* global mod9__fn1 */

include([
  'mod1.js',
  '../mod2.js',
  '../mod5-tpl.js',
  '../mod6.js',
  '../mod7.js',
  '../mod8.js',
  'style.css'
])

/* exported entry */

export default function () {
  if (this['test']) {
    return
  }

  return mod1__fn1() + mod2__fn2() + mod4() + mod5__tpl1() + mod7__fn1() + mod9__fn1()
}
