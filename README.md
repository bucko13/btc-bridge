# btc-bridge

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm](https://img.shields.io/npm/v/btc-bridge.svg)](https://www.npmjs.com/package/btc-bridge)

A simple library for broadcasting Bitcoin transactions and querying chain state over RPC and/or 3rd party provider APIs

## Installation

`npm install --save btc-bridge`

## Providers

All blockchain operations are performed through configurable Provider objects. Currently, there are three providers to choose from:

#### JSON-RPC

This provider allows you to connect through a Bitcoin node's RPC interface.

Supported networks: MAINNET, TESTNET, REGTEST

```javascript
const btcBridge = require('btcBridge')

let network = btcBridge.networks.MAINNET // or btcBridge.networks.TESTNET
let uri = 'http://64.101.12.227:8332' // the node URI
let un = 'rpcuser' // the node rpc user name
let pw = 'rpcpass' // the node rpc password
let raw = false // additionally return the raw result from the provider (default: false)

let rpcProvider = new btcBridge.providers.JsonRpcProvider(network, uri, un, pw, raw)
```

#### Blockcypher

This provider allows you to connect using the Blockcypher API.

Supported networks: MAINNET, TESTNET

```javascript
const btcBridge = require('btcBridge')

let network = btcBridge.networks.MAINNET // or btcBridge.networks.TESTNET
let apiKey = '62a583e112d94dbacfe6143beef65e12' // your Blockcypher API key
let raw = false // additionally return the raw result from the provider (default: false)

let bcProvider = new btcBridge.providers.BlockcypherProvider(network, apiKey, raw)
```

#### Fallback

This provider allows you to fall back on other providers. The provider is configured with an array of JSON-RPC and/or Blockcypher providers. By default, the first provider in the array will be used, and in the event of failure, the next provider in the list will be attempted, in sequential order. You may optionally set `randomize` to `true` in order to randomize the order in which providers are used on each function call.

Supported networks: Dependent upon type of providers added, all added providers must use the same network.

```javascript
const btcBridge = require('btcBridge')

let network = btcBridge.networks.MAINNET // or btcBridge.networks.TESTNET

let uri1 = 'http://64.101.12.111:8332' // the node URI
let un1 = 'rpcuser1' // the node rpc user name
let pw1 = 'rpcpass1' // the node rpc password

let rpcProvider1 = new btcBridge.providers.JsonRpcProvider(network, uri1, un1, pw1)

let uri2 = 'http://64.101.12.222:8332' // the node URI
let un2 = 'rpcuser2' // the node rpc user name
let pw2 = 'rpcpass2' // the node rpc password

let rpcProvider2 = new btcBridge.providers.JsonRpcProvider(network, uri2, un2, pw2)

let apiKey = '62a583e112d94dbacfe6143beef65e12' // your Blockcypher API key

let bcProvider = new btcBridge.providers.BlockcypherProvider(network, apiKey)

let randomize = true // randomize the order of providers on each function call (default: false)
let providers = [rpcProvider1, rpcProvider2, bcProvider] // an array of already configured providers
let fbProvider = new btcBridge.providers.FallbackProvider(providers, randomize)
```

## Provider Methods

Providers query their sources and return values using a uniform result schema. Setting `raw` to `true` in the methods below will also add a `raw` field to the result containing the exact repsonse received from the provider's source.

Each provider contains the following methods:

#### getUnspentOutputsAsync

This function is used to query for the UTXOs for a given bitcoin address.

```javascript
let address = 'mvFu8oJiWjrTXqAkJ3iKR7F2UKmYuYWutF' // the bitcoin address to query
let raw = false // additionally return the raw result from the provider (default: false)
let result = await fbProvider.getUnspentOutputsAsync(address, raw)
```

Sample response:

```json
{
  "unspentOutputs": [
    {
      "fromTxId": "f09257b2bd15b294264d766bbc27c1f32b9c29b16e6a940d10116d6a7d389ba9",
      "outputIndex": 1,
      "amount": 2.34596609
    },
    {
      "fromTxId": "f6eec7a0d35e702c476a0eeabbd91a2269a9a18b54cf717f46422ecf2365b7c5",
      "outputIndex": 1,
      "amount": 2.34606139
    }
  ]
}
```

**IMPORTANT NOTE:** When using the JSON-RPC provider, the address for which you are querying UTXO data MUST be under watch by the node, otherwise the results will always be an empty array! To be watched by a node, the address first needs to be imported or added to the node's wallet.

#### broadcastTransactionAsync

This function is used to broadcast a transaction out to the network.

```javascript
let transactionHex =
  '0200000001e12891c625a8b727d86fcb785bf21666e16a27eb1ad54514a4d7fce0c018261e010000008a4730440220403386749a676873f658ffed210024595a28ea351ac281f5fc8d8e86f6934e4402207fe8e320c192d81339f82fb81813bd3616ca9acd5c09eb2535b1a469b69407dd014104ca65bc9fd7b1748b989dd86cc393b846ba89db71fc027b2db0dc5c3c3358a768b1431573e38526e3b969aac044b82c2908e01a006cb401cc73495c09af81da2effffffff020000000000000000086a06deadbeefcafec4ea0a0e000000001976a914a1b10285fa95a92cf4027112149de550d4c23ada88ac00000000' // the transaction body
let raw = false // additionally return the raw result from the provider (default: false)
let result = await fbProvider.broadcastTransactionAsync(transactionHex, raw)
```

Sample response:

```json
{
  "txId": "f09257b2bd15b294264d766bbc27c1f32b9c29b16e6a940d10116d6a7d389ba9"
}
```

#### getTransactionDataAsync

This function is used to retrieve information about a transaction by the transaction id. If an OP_RETURN output is discovered within the transaction, it will be displayed in the optional `opReturnValue` field.

```javascript
let transactionId = 'f09257b2bd15b294264d766bbc27c1f32b9c29b16e6a940d10116d6a7d389ba9' // the transaction id
let raw = false // additionally return the raw result from the provider (default: false)
let result = await fbProvider.getTransactionDataAsync(transactionId, raw)
```

Sample response:

```json
{
  "txId": "f09257b2bd15b294264d766bbc27c1f32b9c29b16e6a940d10116d6a7d389ba9",
  "version": 2,
  "blockHash": "00000000000002a636af7536fe3672da255adcc18c4b17d3311320fb3f0cf4b4",
  "confirmations": 6,
  "time": 1563389415,
  "blockTime": 1563389415,
  "size": 240,
  "valueIn": 2.35596609,
  "valueOut": 2.34596609,
  "fees": 0.01,
  "opReturnValue": "deadbeefcafe"
}
```

#### getBlockDataAsync

This function is used to retrieve information about a block by the block hash or block height.

```javascript
let blockHash = '00000000000002a636af7536fe3672da255adcc18c4b17d3311320fb3f0cf4b4' // the block hash
let raw = false // additionally return the raw result from the provider (default: false)
let result = await fbProvider.getBlockDataAsync(transactionId, raw)
```

Sample response:

```json
{
  "hash": "00000000000002a636af7536fe3672da255adcc18c4b17d3311320fb3f0cf4b4",
  "height": 1569403,
  "size": 33378,
  "version": 536870912,
  "confirmations": 6,
  "merkleRoot": "6647bf3a257a41772f65947bb00ae055bbcf2767574226cd691d7d570cf58b2a",
  "nTx": 198,
  "tx": ["An array of transaction ids for this block, removed from this sample response"],
  "previousBlockHash": "000000000015b1950d9f65de374ed01c6fff2aa5873647f79e0e7a5db2d3659f",
  "time": 1563389415,
  "nonce": 3447372525,
  "difficulty": 4729661.074040298
}
```

#### getEstimatedFeeAsync

This function is used to discover the estimated fee necessary for transaction confirmation over the next `numBlocks` blocks.
The returned value is expressed in BTC per kilobyte.

```javascript
let numBlocks = 2
let raw = false // additionally return the raw result from the provider (default: false)
let result = await fbProvider.getEstimatedFeeAsync(numBlocks, raw)
```

Sample response:

```json
{
  "feerate": 0.00001037
}
```

## Wallet

A Wallet object contains information about a bitcoin address as well as a provider to perform functions for that address. Currently, this is limited to the generation (and optional broadcast) of an OP_RETURN transaction.

#### generateOpReturnTxAsync

This function will automatically retrieve a fee estimate and calculate the final fee to be used in the transaction.

```javascript
let pkWIF = 'c3sdjjXQfj2ncC3YXb8d1Xjg8rJ2oxXnp5BQ8iskE3aFbeefKVb' // the private key in WIF format for the address
let provider = fbProvider // or any previous configured provider
let wallet = new btcBridge.Wallet(pkWIF, provider)

let opReturnHexData = 'deadbeefcafe' // the hex data to be stored in the OP_RETURN output
let confirmBlocks = 6 // the number of blocks blocks to target before confirmation, used for fee calculation (default: 2)
let broadcast = true // optionaly broadcast the transaction to the network (default: false)
let result = await wallet.generateOpReturnTxAsync(opReturnHexData, confirmBlocks, broadcast)
```

Sample response:

```json
{
  "txId": "7e0c84de8597a7e195e6950e30d4f13d760ff5fa968e19ccf04d37e48e73ffb8",
  "txHex": "0200000001179a398adde5b8d70c6643d8515bfb4b63556904ab719d0df3c60a218a0ba0bc010000008b483045022100b06a40017e1dce8d03259cdcf1cc4953d7adcf1b4bdf3f80b57250fe5bbf9bca02207b0063ce93f1c3b95d8fb12db8e54e05652612b661425198bfb83a1ed9888374014104ca65bc9fd7b1748b989dd86cc393b846ba89db71fc027b2db0dc5c3c3358a768b1431573e38526e3b969aac044b82c2908e01a006cb401cc73495c09af81da2effffffff020000000000000000086a06deadbeefcafe2464090e000000001976a914a1b10285fa95a92cf4027112149de550d4c23ada88ac00000000"
}
```

#### generateOpReturnTxWithFeeAsync

This function requires the fee value (in BTC) to be explicitly supplied when invoked.

```javascript
let pkWIF = 'c3sdjjXQfj2ncC3YXb8d1Xjg8rJ2oxXnp5BQ8iskE3aFbeefKVb' // the private key in WIF format for the address
let provider = fbProvider // or any previous configured provider
let wallet = new btcBridge.Wallet(pkWIF, provider)

let opReturnHexData = 'deadbeefcafe' // the hex data to be stored in the OP_RETURN output
let fee = 0.001 // the fee to pay to miners, expressed in BTC. Set to `false` to have the fee estimated automatically (default: false)
let broadcast = true // optionaly broadcast the transaction to the network (default: false)
let result = await wallet.generateOpReturnTxWithFeeAsync(opReturnHexData, fee, broadcast)
```

Sample response:

```json
{
  "txId": "b0a8e2588c4d300097dd2ee5920fd9aab05446c799605de04c353b6234abe267",
  "txHex": "020000000139a22c3ccc85736fa8ae134b079e9d014c93acfee901f12fcaafbb9d7e053c0e010000008a4730440220205013a0e2c648e9c7944c63fa6669c817f6102cf5d38fee6449733269440e6b022064471aac316ffa97743ac99eaf08dcb8aae20e6ede7a388cbf981870cca02650014104ca65bc9fd7b1748b989dd86cc393b846ba89db71fc027b2db0dc5c3c3358a768b1431573e38526e3b969aac044b82c2908e01a006cb401cc73495c09af81da2effffffff020000000000000000086a06deadbeefcafee2ab1108000000001976a914a1b10285fa95a92cf4027112149de550d4c23ada88ac00000000"
}
```
