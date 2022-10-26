import { concatAST, Kind, OperationDefinitionNode } from 'graphql'
import type { FragmentDefinitionNode, DocumentNode } from 'graphql'
import { oldVisit } from '@graphql-codegen/plugin-helpers'
import type { PluginFunction } from '@graphql-codegen/plugin-helpers'
import { ClientSideBaseVisitor } from '@graphql-codegen/visitor-plugin-common'
import type { LoadedFragment } from '@graphql-codegen/visitor-plugin-common'
import { upperFirst } from 'scule'

export const plugin: PluginFunction = (schema, documents, config) => {
  const allAst = concatAST(documents.map(({ document }) => document) as DocumentNode[])

  const operations = allAst.definitions.filter(d => d.kind === Kind.OPERATION_DEFINITION) as OperationDefinitionNode[]

  const allFragments: LoadedFragment[] = [
    ...(allAst.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION) as FragmentDefinitionNode[]).map(
      fragmentDef => ({
        node: fragmentDef,
        name: fragmentDef.name.value,
        onType: fragmentDef.typeCondition.name.value,
        isExternal: false
      })
    ),
    ...(config.externalFragments || [])
  ]

  const visitor = new ClientSideBaseVisitor(schema, allFragments, config, {}, documents)

  const visitorResult = oldVisit(allAst, { leave: visitor as any })

  const GqlFunctions: string[] = []

  for (const entry of operations) {
    const name = entry.name?.value

    if (!name) { continue }

    const opName = upperFirst(name) + upperFirst(entry.operation)

    let func = `    ${name}: <T extends ${opName}, V extends ${opName}Variables> (variables?: null | V`

    if (entry.operation !== 'subscription') {
      func += `): Promise<T> => client.execute<T>(${upperFirst(name)}Document, variables)`
    } else {
      func += `, options?: WSClientOptions): WSOutput<T> => client.subscribe(${upperFirst(name)}Document, variables, options)`
    }

    GqlFunctions.push(func)
  }

  const importList = ['GqlClient', ...((operations.some(o => o.operation === 'subscription') && ['WSOutput', 'WSClientOptions']) || [])]

  return {
    prepend: [
      `import type { ${importList.join(', ')} } from 'ohmygql'`,
      ...visitor.getImports()
    ],
    content: [
      visitor.fragments,
      ...visitorResult.definitions.filter((t: string) => typeof t === 'string'),
      'export function gqlSdk (client: GqlClient) {',
      '  return {',
      GqlFunctions.join(',\n'),
      '  }',
      '}'
    ].join('\n')
  }
}

export const mockPlugin = (operations: Record<string, string>) => {
  const GqlFunctions: string[] = []

  for (const [k, v] of Object.entries(operations)) {
    if (!v.includes('subscription')) {
      GqlFunctions.push(`    ${k}: (variables = undefined) => client.execute(\`${v}\`, variables)`)
    } else {
      GqlFunctions.push(`    ${k}: (variables = undefined, options = undefined) => client.subscribe(\`${v}\`, variables, options)`)
    }
  }

  return [
    'export function gqlSdk (client) {',
    '  return {',
    GqlFunctions.join(',\n'),
    '  }',
    '}'
  ].join('\n')
}
