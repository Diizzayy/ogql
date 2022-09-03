export type GqlOperation = {
  name?: string
  type?: 'query' | 'mutation'
}

export type GraphQLError = {
  message?: string
  locations?: {
    line: number
    column: number
  }[]
  extensions?: {
    code?: string
    [key: string]: any
  }
}

export type GqlResponse<T = any> = {
  data?: T
  errors?: GraphQLError[]
}

export class GqlError extends Error {
  name: 'GqlError' = 'GqlError'
  status?: number
  operation?: GqlOperation
  gqlErrors?: GraphQLError[] | undefined

  constructor (message: string, args: {
    status?: number
    operation?: GqlOperation
    gqlErrors?: GraphQLError[]
  }) {
    super(message)
    this.status = args.status
    this.operation = args.operation
    this.gqlErrors = args.gqlErrors
  }
}
