import fs from 'fs'
import path from 'path'
import transform from './transform-tpl'
import R from 'ramda'

const includesReg = /include\s*\(\[([^\]]+)\]\)\s*;?/

// 同时包含 exported注释 和 函数声明时，才认为需要 export
const exportedReg = /\/\*\s+exported\s+([$\w]+)\s+\*\//
const declareReg = /(?:^function\s+([$\w]+)|^var\s+([$\w]+))/

function nonNullFilter (item) {
  return !!item
}

function readFile (filepath) {
  // css 不解析
  if (filepath.match(/\.css$/)) return null

  // 转译模板
  return transform(fs.readFileSync(filepath, 'utf8'))
}

function isEs6Code (cnt) {
  return !!cnt.match(/import.*?from/) || !!cnt.match(/export.*?\{[^}]+\}/)
}

function hasInclude (cnt) {
  return includesReg.test(cnt)
}

function needParse (cnt) {
  // es6 module无需解析
  // 但是es6 module 和 include 混用时要解析
  if (isEs6Code(cnt) && !hasInclude(cnt)) {
    return false
  }

  return true
}

function parseDeclared (m) {
  // function | var
  return m.match(declareReg)[1] || m.match(declareReg)[2]
}

function parseIncludes (dir, cnt) {
  const match = cnt.match(includesReg)
  if (!match) return []
  return match[1].split(',').map(line => {
    if (!line.trim()) {
      return
    }
    return line.match(/\s*['"]([^'"]+)['"]\s*/)[1]
  }).filter(nonNullFilter).map(filepath => path.normalize(dir + filepath))
}

function parseExports (cnt) {
  if (!cnt || !needParse(cnt)) return null

  let exports = R.compose(
    R.uniq,
    R.map(exported => exportedReg.exec(exported)[1]),
    R.match(new RegExp(exportedReg, 'g'))
  )(cnt)

  if (exports.length) return exports

  // 没有exported 函数时，将所有的函数都暴露
  let fnMatchs = cnt.match(new RegExp(declareReg, 'mg'))

  if (!fnMatchs) return null

  return fnMatchs.map(parseDeclared)
}

function removeIncludes (cnt) {
  return cnt.replace(/include\(\[[\s\S]+?\]\)\s*;\s*/, '')
}

function generateImports (dir, cnt, paths) {
  let importCache = []
  return paths.map(filepath => {
    let fromCnt = readFile(filepath)
    let imports = parseExports(fromCnt)

    if (!imports) return null

    let declaredFns = R.compose(
      R.map(parseDeclared),
      R.match(new RegExp(declareReg, 'mg'))
    )(cnt)
    imports = R.compose(
      // 排除已经import的函数
      R.reject(importFn => R.contains(importFn, importCache)),

      // 排除本文件声明过的函数
      R.reject(importFn => R.contains(importFn, declaredFns))
    )(imports)
    importCache = R.concat(importCache, imports)
    return `import { ${R.join(',', imports)} } from '${filepath}';`
  }).filter(nonNullFilter).join('\n')
}

function generateExports (fns) {
  if (!fns) return ''

  return `export {\n    ${fns.join(',\n    ')}\n}`
}

export {
  readFile,
  needParse,
  removeIncludes,
  parseIncludes,
  parseExports,
  generateImports,
  generateExports
}
