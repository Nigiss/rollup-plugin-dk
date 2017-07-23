import {
  readFile,
  needParse,
  removeIncludes,
  parseIncludes,
  parseExports,
  generateImports,
  generateExports
} from './parse'
import transform from './transform-tpl'

function getCurrDir (path) {
  return path.replace(/(.*\/)(.*)/, '$1')
}

export default function () {
  return {
    name: 'dk',
    load (id) {
      // css 不解析
      if (id.match(/\.css$/)) {
        return false
      }

      let cnt = readFile(id)
      if (needParse(cnt)) {
        return cnt
      }

      let currDir = getCurrDir(id)
      let includePaths = parseIncludes(currDir, cnt)
      let exportedFns = parseExports(cnt)
      let code = `${generateImports(currDir, includePaths)}\n${removeIncludes(cnt)}\n${generateExports(exportedFns)}`
      return transform(code)
    }
  }
}
