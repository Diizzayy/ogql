import { print } from 'graphql'
import { $fetch, FetchError } from 'ohmyfetch'
import type { FetchOptions } from 'ohmyfetch'
import type { DocumentNode } from 'graphql'
import type { GqlResponse } from './types'
import { extractOperation } from './utils'
import { GqlError } from './types'

export * from './types'

export type GqlMiddleware = {
  onRequest?: FetchOptions['onRequest']
  onResponse?: FetchOptions['onResponse'];
  onRequestError?: FetchOptions['onRequestError'];
  onResponseError?: FetchOptions['onResponseError'];
};

export const GqlClient = (input: string | {
  host: string,
  middleware?: GqlMiddleware,
  useGETForQueries?: boolean,
  headers?: Record<string, string>
}) => {
  const opts = typeof input === 'string' ? { host: input } : input

  let fetchOptions: FetchOptions<'json'> = {}

  const setHost = (host: string) => {
    if (!host) { return }

    opts.host = host
  }

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

  const setMiddleware = (mw: GqlMiddleware) => {
    if (!mw) { return }

    opts.middleware = opts.middleware || {}

    for (const [k, v] of Object.entries(mw)) {
      // @ts-ignore
      opts.middleware[k] = v
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

    const useGET = opts?.useGETForQueries && extractOperation(query)?.type === 'query'

    const reqOptions = {
      query,
      ...(variables && { variables: !useGET ? variables : JSON.stringify(variables) })
    }

    const res = await $fetch.raw<T>(opts.host, {
      ...(!useGET && { method: 'POST' }),
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers
      },
      ...opts?.middleware,
      ...(!useGET ? { body: reqOptions } : { params: reqOptions })
    }).catch((e: FetchError<T>) => e)

    if (res instanceof FetchError || res?._data?.errors) {
      const gqlErrors = (res instanceof FetchError ? res.data?.errors : res._data?.errors) || undefined
      const response = res instanceof FetchError ? res.response : res
      const status = response?.status

      const message = gqlErrors?.map(e => e.message).join(', ') || (response && `${status} ${response?.statusText}`) || 'Fetch failed'

      throw new GqlError(message, { status, gqlErrors, operation: extractOperation(query) })
    }

    return res._data?.data
  }

  return { execute, setHost, setOptions, setHeaders, setMiddleware }
}

export type GqlClient = ReturnType<typeof GqlClient>
