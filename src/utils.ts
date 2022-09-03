import type { DocumentNode } from 'graphql'
import type { GqlOperation } from './types'

export const extractOperation = (query: string | DocumentNode): GqlOperation => {
  let name: GqlOperation['name']
  let type: GqlOperation['type']

  if (typeof query !== 'string') {
    // @ts-ignore
    name = query?.definitions?.[0]?.name.value

    // @ts-ignore
    type = query?.definitions?.[0]?.operation
  } else {
    name = (!(/(query|mutation)(\s+)?\{/.test(query)) &&
    query.match(/\w+(?=(\s+)?(\{|\())(?!(query|mutation))/)?.[0]) || undefined
    type = (query.match(/(query|mutation)(?=(\s+)\w*(\s+)?(\{|\())/)?.[0] as GqlOperation['type']) || undefined
  }

  return { name, type }
}
