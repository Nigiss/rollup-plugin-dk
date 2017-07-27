import {
  readFile,
  needParse,
  removeIncludes,
  parseIncludes,
  parseExports,
  generateImports,
  generateExports
} from './parse'
import R from 'ramda'

function getCurrDir (path) {
  return path.replace(/(.*\/)(.*)/, '$1')
}

export default function () {
  return {
    name: 'dk',
    load (id) {
      let cnt = readFile(id)
      if (!needParse(cnt)) {
        return cnt
      }

      let currDir = getCurrDir(id)
      let includePaths = R.compose(
        R.reject(R.equals(id)),
        R.uniq,
        parseIncludes
      )(currDir, cnt)
      let exportedFns = parseExports(cnt)
      let code = `${generateImports(currDir, cnt, includePaths)}\n${removeIncludes(cnt)}\n${generateExports(exportedFns)}\n`
      return code
    }
  }
}
