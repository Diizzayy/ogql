import { print } from 'graphql'
import { $fetch, FetchError } from 'ofetch'
import type { FetchOptions } from 'ofetch'
import type { DocumentNode } from 'graphql'
import type { ClientOptions, ExecutionResult } from 'graphql-ws'
import type { GqlResponse } from './types'
import { extractOperation } from './utils'
import { GqlError } from './types'
import wsClient from './ws'

export * from './types'

export type GqlMiddleware = {
  onRequest?: FetchOptions['onRequest']
  onResponse?: FetchOptions['onResponse'];
  onRequestError?: FetchOptions['onRequestError'];
  onResponseError?: FetchOptions['onResponseError'];
};

export type WSClientOptions = Partial<Omit<ClientOptions, 'url'>>
type WSNextHandler<T = any> = (result: ExecutionResult<T>) => void
type WSErrorHandler = (err: Error) => void
export type WSOutput <T = any> = {
  /**
   * Restart the WebSocket connection.
   */
  restart: () => void

  /**
   * Initiate the WebSocket connection and listens for events.
   */
  subscribe: () => void

  /**
   * Destroy the WebSocket connection.
   */
  unsubscribe: () => void

  /**
   * onResult is called with the result of the subscription.
   *
   * Must be called before `subscribe`.
   *
   * @param {WSNextHandler<T>} cb - The callback to be called when a new result is received.
   */
   onResult: (cb: WSNextHandler<T>) => void

  /**
   * onError accepts a callback that is triggered when an error occurs.
   *
   * Must be called before `subscribe`.
   */
  onError: (cb: WSErrorHandler) => void

  /**
   * Triggers when the WebSocket connection has completed.
   */
  onComplete: (cb: () => void) => void
}

export const GqlClient = (input: string | {
  host: string,
  wsHost?: string,
  wsOptions?: WSClientOptions,
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

  function subscribe<T = any>(opts: { query: string | DocumentNode, variables?: Record<string, any> | null, options?: WSClientOptions }): WSOutput<T>
  function subscribe<T = any> (query: string | DocumentNode, variables?: Record<string, any> | null, options?: WSClientOptions): WSOutput<T>

  function subscribe<T = any> (...args: any[]): WSOutput<T> {
    let query: string | DocumentNode = args?.[0]?.query || args?.[0]
    query = typeof query === 'string' ? query : print(query)

    const variables = args?.[0]?.variables || args?.[1]

    const options = args?.[0]?.options || args?.[2]

    const url = opts?.wsHost || opts?.host.replace(/^http/, 'ws').replace(/^https/, 'wss')

    if (!url || !url.startsWith('ws')) { throw new Error('Invalid websocket host') }

    const client = wsClient({ url, ...opts?.wsOptions, ...options })

    let unsubscribe = () => {}
    let onError: WSErrorHandler
    let onResult: WSNextHandler<T>
    let onComplete: () => void

    return {
      restart: () => client.restart(),
      unsubscribe: () => unsubscribe(),
      onError: cb => (onError = cb),
      onResult: cb => (onResult = cb),
      onComplete: cb => (onComplete = cb),
      subscribe: () => {
        // @ts-expect-error 'DocumentNode' is not assignable to type 'string'
        unsubscribe = client.subscribe({ query, variables }, {
          next: onResult || (() => {}),
          error: onError || (() => {}),
          complete: onComplete || (() => {})
        })
      }
    }
  }

  return { execute, subscribe, setHost, setOptions, setHeaders, setMiddleware }
}

export type GqlClient = ReturnType<typeof GqlClient>
