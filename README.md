# ogql

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

> Minimal GraphQL Client

## Install Package

```sh
# yarn
yarn install ogql

# pnpm
pnpm install ogql
```

## Usage

```ts
import { GqlClient } from 'ogql'

const client = new GqlClient({ host: 'https://example.com/graphql' })

const result = await client.execute('query { todos { id text } }')
```

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable` (use `npm i -g corepack` for Node.js < 16.10)
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Made with 💛

Published under [MIT License](./LICENSE).

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/ogql?style=flat-square
[npm-version-href]: https://npmjs.com/package/ogql

[npm-downloads-src]: https://img.shields.io/npm/dm/ogql?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/ogql

[github-actions-src]: https://img.shields.io/github/workflow/status/diizzayy/ogql/ci/main?style=flat-square
[github-actions-href]: https://github.com/diizzayy/ogql/actions?query=workflow%3Aci

[codecov-src]: https://img.shields.io/codecov/c/gh/diizzayy/ogql/main?style=flat-square
[codecov-href]: https://codecov.io/gh/diizzayy/ogql
