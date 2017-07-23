import fs from 'fs'

const fileCache = {}
const includesReg = /include\s*\(\[([\s\S]+)\]\)\s*;?/

function nonNullFilter (item) {
  return !!item
}

function readFile (path) {
  return fileCache[path] || (fileCache[path] = fs.readFileSync(path, 'utf8'))
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
    return true
  }

  return false
}

function parseIncludes (dir, cnt) {
  const match = cnt.match(includesReg)
  if (!match) return []
  return match[1].split(',').map(line => {
    if (!line.trim()) {
      return
    }
    return line.match(/\s*['"]([^'"]+)['"]\s*/)[1]
  }).filter(nonNullFilter).map(path => dir + path)
}

function parseExports (cnt) {
  if (needParse(cnt)) {
    return null
  }

  // 解析exported语法：/* exported chList__entry */
  let reg = /\/\*\s+exported\s+(\w+)\s+\*\//
  var exports = (cnt.match(new RegExp(reg, 'g')) || []).map(exported => reg.exec(exported)[1])

  if (exports.length) return exports

  // 没有exported 函数时，将所有的函数都暴露
  let regStr = '^function\\s+(\\w+)'
  let match = cnt.match(new RegExp(regStr, 'mg'))

  // 没有函数
  if (!match) return null

  return match.map(m => m.match(regStr)[1])
}

function removeIncludes (cnt) {
  return cnt.replace(/include\(\[[\s\S]+?\]\)\s*;\s*/, '')
}

function generateImports (paths) {
  return paths.map(path => {
    var exportFns = parseExports(readFile(path))
    if (!exportFns) return null

    return `import { ${exportFns.join(', ')} } from '${path}';`
  }).filter(nonNullFilter).join('\n')
}

function generateExports (fns) {
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
