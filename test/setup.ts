import { fileURLToPath } from 'node:url'
import { generate } from '@graphql-codegen/cli'

const outputFile = fileURLToPath(new URL('./output/gql.ts', import.meta.url).href)

const pluginLoader = async (n) => {
  if (n === '@graphql-codegen/ohmygql/plugin') {
    return Promise.resolve(import('ohmygql/plugin'))
  }

  return Promise.resolve(import(n))
}

await generate({
  cwd: fileURLToPath(new URL('.', import.meta.url).href),
  debug: false,
  silent: true,
  schema: ['https://nuxt-gql-server-2gl6xp7kua-ue.a.run.app/query'],
  documents: ['./test.gql'],
  pluginLoader,
  generates: {
    [outputFile]: {
      plugins: ['typescript', 'typescript-operations', 'ohmygql/plugin'],
    }
  }
})


