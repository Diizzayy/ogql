import { print } from 'graphql'
import { $fetch, FetchError } from 'ohmyfetch'
import type { FetchOptions } from 'ohmyfetch'
import type { DocumentNode } from 'graphql'
import type { GqlResponse } from './types'
import { extractOperation } from './utils'
import { GqlError } from './types'

export * from './types'

export type GqlMiddleware <T extends object = object> = {
  onRequest?: T extends Array<any> ? FetchOptions['onRequest'][] : FetchOptions['onRequest']
  onResponse?: T extends Array<any> ? FetchOptions['onResponse'][] : FetchOptions['onResponse']
  onRequestError?: T extends Array<any> ? FetchOptions['onRequestError'][] : FetchOptions['onRequestError']
  onResponseError?: T extends Array<any> ? FetchOptions['onResponseError'][] : FetchOptions['onResponseError']
};
type GqlMiddlewareKeys = keyof GqlMiddleware

export const GqlClient = (input: string | {
  host: string,
  middleware?: GqlMiddleware,
  headers?: Record<string, string>
}) => {
  const opts = typeof input === 'string' ? { host: input } : input

  let fetchOptions: FetchOptions<'json'> = {}

  const setOptions = (opts?: null | Pick<FetchOptions<'json'>, 'retry' | 'headers' | 'mode' | 'cache' | 'credentials'>) => {
    if (!opts) {
      fetchOptions = {}
      return
    }

    for (const [k, v] of Object.entries(opts)) {
      if (!v) {
        // @ts-ignore
        delete fetchOptions[k]
        continue
      }

      // @ts-ignore
      fetchOptions[k] = typeof v !== 'object' ? v : { ...fetchOptions[k], ...v }
    }
  }

  const setHeaders = (headers?: FetchOptions['headers']) => setOptions({ headers })

  const middlewares: GqlMiddleware<any[]> = { }
  const setMiddleware = (mw: GqlMiddleware) => {
    if (!mw) { return }

    opts.middleware = opts.middleware || {}

    for (const [k, v] of Object.entries(mw) as [GqlMiddlewareKeys, any][]) {
      middlewares[k] = middlewares[k] || []

      // @ts-ignore
      middlewares[k].push(v)
    }
  }

  function execute<T = any>(opts: { query: string | DocumentNode; variables?: any | Record<string, any>; headers?: HeadersInit; }): Promise<T>;
  function execute<T = any>(query: string | DocumentNode, variables?: any | Record<string, any>, headers?: HeadersInit): Promise<T>;

  async function execute<T extends GqlResponse<T>> (...args: any[]) {
    let query: string | DocumentNode = args?.[0]?.query || args?.[0]

    query = typeof query === 'string' ? query : print(query)

    const variables = args?.[0]?.variables || args?.[1]

    fetchOptions.headers = fetchOptions?.headers || {}
    fetchOptions.headers = {
      ...opts?.headers,
      ...(args?.[0]?.headers || args?.[2]),
      ...fetchOptions?.headers
    }

    const middleware: GqlMiddleware = { }
    for (const mw of Object.keys(middlewares) as GqlMiddlewareKeys[]) {
      middleware[mw] = async (ctx: any) => {
        if (opts.middleware?.[mw]) { middlewares[mw]?.unshift(opts.middleware[mw]) }
        // @ts-ignore
        await Promise.all(middlewares[mw]?.filter(Boolean).map((fn: () => any) => fn(ctx)))
      }
    }

    const res = await $fetch.raw<T>(opts.host, {
      method: 'POST',
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers
      },
      ...middleware,
      body: { query, variables }
    }).catch((e: FetchError<T>) => e)

    if (res instanceof FetchError || res?._data?.errors) {
      const gqlErrors = (res instanceof FetchError ? res.data?.errors : res._data?.errors) || undefined
      const response = res instanceof FetchError ? res.response : res
      const status = response?.status

      const message = gqlErrors?.map(e => e.message).join(', ') || `${status} ${response?.statusText}`

      throw new GqlError(message, { status, gqlErrors, operation: extractOperation(query) })
    }

    return res._data?.data
  }

  return { execute, setOptions, setHeaders, setMiddleware }
}

export type GqlClient = ReturnType<typeof GqlClient>
