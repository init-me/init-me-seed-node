const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs')
const extOs = require('yyl-os')
const print = require('yyl-print')
const chalk = require('chalk')
const rp = require('yyl-replacer')

const lang = {
  QUEATION_SELECT_TYPE: '请选择构建方式',
  TYPE_ERROR: 'env.type 不存在',
  FINISHED: `初始化完成，请执行: ${chalk.yellow('yarn bootstrap')}`,
  PRETTIER_START: '正在格式化代码',
  PRETTIER_FINISHED: '格式化完成',
}

const SEED_PATH = path.join(__dirname, 'seeds')

const initData = {
  name: '',
  type: '',
  componentName: '',
  componentPrefix: ''
}

const config = {
  hooks: {
    async beforeStart ({ env }) {
      let iType = ''
      const types = fs.readdirSync(SEED_PATH).filter((iPath) => {
        if (/^\./.test(iPath)) {
          return false
        }
        return true
      })

      if (env && env.type) {
        if (types.indexOf(env.type) !== -1) {
          iType = env.type
          initData.name = env.name
        } else {
          throw new Error(`${lang.TYPE_ERROR}: ${env.type}`)
        }
      } else if (types.length === 1) {
        iType = types[0]
        initData.type = iType
      } else {
        const r = await inquirer.prompt([{
          type: 'list',
          name: 'type',
          message: `${lang.QUEATION_SELECT_TYPE}:`,
          default: types[0],
          choices: types
        }])
        iType = r.type
        initData.type = r.type
      }

      config.path = path.join(SEED_PATH, iType)
    },
    beforeCopy ({ fileMap, targetPath, logger }) {
      fileMap[path.join(config.path, 'gitignore')] = [
        path.join(targetPath, '.gitignore')
      ]

      fileMap[path.join(config.path, 'npmignore')] = [
        path.join(targetPath, '.npmignore')
      ]
      return Promise.resolve(fileMap)
    },
    async afterCopy ({ targetPath, logger }) {
      await extOs.runSpawn('yarn init', path.join(targetPath))

      // + format
      logger.log('info', [lang.FORMAT_FILE_START])
      let rPaths = []

      // base case
      if (initData.type === 'base') {
        rPaths = [
        ]
      } else if (initData.type === 'typescript') {
        rPaths = [
          path.join(targetPath, 'package.json'),
          path.join(targetPath, 'GettingStarted.md')
        ]
      }
      rPaths.forEach((iPath) => {
        if (!fs.existsSync(iPath)) {
          return
        }
        const cnt = fs.readFileSync(iPath).toString()
        fs.writeFileSync(iPath, rp.dataRender(cnt, initData))
        logger.log('update', [iPath])
      })
      // - format
      logger.log('success', [lang.FINISHED])
    }
  },
  path: './seeds'
}
module.exports = config
