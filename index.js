const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs')
const extOs = require('yyl-os')
const print = require('yyl-print')

const lang = {
  QUEATION_SELECT_TYPE: '请选择构建方式',
  TYPE_ERROR: 'env.type 不存在',
  INSTALL_START: '正在安装依赖',
  INSTALL_FINISHED: '安装依赖完成',
  INSTALL_TEST_START: '正在安装测试部分依赖',
  INSTALL_TEST_FINISHED: '安装测试部分依赖完成'
}

const SEED_PATH = path.join(__dirname, 'seeds')

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
        } else {
          throw new Error(`${lang.TYPE_ERROR}: ${env.type}`)
        }
      } else if (types.length === 1) {
        iType = types[0]
      } else {
        const r = await inquirer.prompt([{
          type: 'list',
          name: 'type',
          message: `${lang.QUEATION_SELECT_TYPE}:`,
          default: types[0],
          choices: types
        }])
        iType = r.type
      }

      config.path = path.join(SEED_PATH, iType)
    },
    beforeCopy ({ fileMap, targetPath }) {
      fileMap[path.join(config.path, 'gitignore')] = [
        path.join(targetPath, '.gitignore')
      ]

      fileMap[path.join(config.path, 'npmignore')] = [
        path.join(targetPath, '.npmignore')
      ]
      return Promise.resolve(fileMap)
    },
    async afterCopy ({ targetPath }) {
      const installPath = [
        path.join(targetPath),
        path.join(targetPath, 'test/case/base')
      ]
      await extOs.runSpawn('yarn init', installPath[0])

      print.log.info(lang.INSTALL_START)
      await extOs.runCMD('yarn install', installPath[0])
      print.log.success(lang.INSTALL_FINISHED)

      if (fs.existsSync(installPath[1])) {
        print.log.info(lang.INSTALL_TEST_START)
        await extOs.runCMD('yarn install', installPath[1])
        print.log.info(lang.INSTALL_TEST_FINISHED)
      }
    }
  },
  path: './seeds'
}
module.exports = config
