import { it, expect, describe } from 'vitest'

import type { TodoQuery } from './output/gql'
import { GqlClient } from '../src'

describe('ohmygql', async () => {
  // @ts-ignore
  const { gqlSdk } = await import('./output/gql')

  const instance = GqlClient({
    host: 'https://nuxt-gql-server-2gl6xp7kua-ue.a.run.app/query'
  })

  const client = gqlSdk(instance)
  
  it('use gql client', async () => {
    const { todos } = await client.todo()

    const firstTodo = todos.find(t => t.id === 1)

    expect(firstTodo?.text).toEqual('Watch game of thrones')
  })

  it('basic query', async () => {
    const result = await instance.execute('query { todos { id text } }').catch(console.error) as TodoQuery

    const firstTodo = result?.todos.find(t => t.id === 1)

    expect(firstTodo?.text).toEqual('Watch game of thrones')
  })

  it('basic mutation', async () => {
    const text = Math.random().toString(36).substring(7)

    const result = await client.createTodo({ todo: { text } })

    expect(result.createTodo.text).toEqual(text)
  })

  it('fails with invalid field', async () => {
    const result = await instance.execute('query { todos { idd text } }').catch(e => e)

    expect(result?.gqlErrors[0].message).toEqual(`Cannot query field "idd" on type "Todo". Did you mean "id"?`)
  })

  it('returns operation type and name in error response', async () => {
    const result = await instance.execute('query demo { todos { idd text } }').catch(e => e)

    expect(result?.operation).toContain({ type: 'query', name: 'demo' })
  })

  it('authenticated request to github api', async () => {
    const github = GqlClient({ 
      host: 'https://api.github.com/graphql',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
      }
    })

    const result = await github.execute<{ viewer: { login: string } }>('query { viewer { id login } }')

    expect(result?.viewer?.login).toEqual('github-actions[bot]')
  })
})
