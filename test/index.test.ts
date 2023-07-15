import WS from 'ws'
import { it, expect, describe } from 'vitest'

import { GqlClient } from '../src'
import type { GetTodosQuery } from './output/gql'

describe('ogql', async () => {
  // @ts-ignore
  const { gqlSdk } = await import('./output/gql')

  const instance = GqlClient({
    host: 'https://nuxt-gql-server-2gl6xp7kua-ue.a.run.app/query',
    wsOptions: { webSocketImpl: WS }
  })

  const client = gqlSdk(instance)

  it('retrieve all todos', async () => {
    const { todos } = await client.getTodos()

    const firstTodo = todos.find(t => t.id === 1)

    expect(firstTodo?.text).toEqual('Watch game of thrones')
  })

  it('retrieve todo with id of 1', async () => {
    const { todo } = await client.getTodo({ id: 1 })

    expect(todo?.text).toEqual('Watch game of thrones')
  })

  it('basic query', async () => {
    const result = await instance.execute('query { todos { id text } }').catch(console.error) as GetTodosQuery

    const firstTodo = result?.todos.find(t => t.id === 1)

    expect(firstTodo?.text).toEqual('Watch game of thrones')
  })

  it('basic mutation', async () => {
    const text = Math.random().toString(36).substring(7)

    const result = await client.createTodo({ todo: { text } })

    expect(result.createTodo.text).toEqual(text)
  })

  it('basic subscription', async () => {
    const { subscribe, onResult } = client.todoAdded()

    const unsubscribe = await subscribe()

    const results: string[] = []
    onResult((r) => {
      if (!r?.data?.todoAdded?.text) { return }

      results.push(r.data.todoAdded.text)
    })

    const text = Math.random().toString(36).substring(7)

    await client.createTodo({ todo: { text } })

    unsubscribe()

    expect(results).toContainEqual(text)
  })

  it('fails with invalid field', async () => {
    const result = await instance.execute('query { todos { idd text } }').catch(e => e)

    expect(result?.gqlErrors[0].message).toEqual('Cannot query field "idd" on type "Todo". Did you mean "id"?')
  })

  it('returns operation type and name in error response', async () => {
    const result = await instance.execute('query demo { todos { idd text } }').catch(e => e)

    expect(result?.operation).toContain({ type: 'query', name: 'demo' })
  })

  if (process.env.GITHUB_ACTIONS) {
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
  }
})
