import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: ['src/index', 'src/plugin', 'src/utils'],
  rollup: {
    emitCJS: true
  }
})
