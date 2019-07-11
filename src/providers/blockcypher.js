/* Copyright 2019 Tierion
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const rp = require('request-promise-native')
const BigNumber = require('bignumber.js')

let blockcypher = function(network, apiToken, withRawResult = false) {
  let networkName = network === 'testnet' ? 'test3' : 'main'
  let blockcypherToken = apiToken
  let globalReturnRawResult = withRawResult

  this.getUnspentOutputsAsync = async (address, withRawResult = false) => {
    let targetUrl = `https://api.blockcypher.com/v1/btc/${networkName}/addrs/${address}?token=${blockcypherToken}&unspentOnly=1`
    let options = { method: 'GET', url: targetUrl, resolveWithFullResponse: true }

    let response
    try {
      response = await rp(options)
    } catch (error) {
      if (error.statusCode) throw new Error(`Invalid response : ${error.statusCode} : ${JSON.parse(error.error).error}`)
      throw new Error(`No response received on getUnspentOutputsAsync : ${error.message}`)
    }

    let rawResult = JSON.parse(response.body)
    if (rawResult.error) throw new Error(rawResult.error)

    let txRefs = rawResult.txrefs
    if (rawResult.unconfirmed_txrefs) txRefs = txRefs.concat(rawResult.unconfirmed_txrefs)
    let unspentOutputs = []
    if (txRefs) {
      unspentOutputs = txRefs.map(output => {
        return {
          fromTxId: output.tx_hash,
          outputIndex: output.tx_output_n,
          value: BigNumber(output.value)
            .dividedBy(10 ** 8)
            .toNumber()
        }
      })
    }

    let result = { unspentOutputs }
    if (withRawResult || globalReturnRawResult)
      result.raw = { provider: 'blockcypher', uri: 'https://api.blockcypher.com/v1', result: rawResult }
    return result
  }

  this.broadcastTransactionAsync = async (transactionHex, withRawResult = false) => {
    let targetUrl = `https://api.blockcypher.com/v1/btc/${networkName}/txs/push?token=${blockcypherToken}`
    let options = {
      method: 'POST',
      url: targetUrl,
      headers: { 'Content-Type': 'application/json' },
      json: { tx: transactionHex },
      resolveWithFullResponse: true
    }

    let response
    try {
      response = await rp(options)
    } catch (error) {
      if (error.statusCode) throw new Error(`Invalid response : ${error.statusCode} : ${JSON.parse(error.error).error}`)
      throw new Error(`No response received on broadcastTransactionAsync : ${error.message}`)
    }

    let rawResult = response.body
    if (rawResult.error) throw new Error(rawResult.error)

    let result = { txId: rawResult.tx.hash }
    if (withRawResult || globalReturnRawResult)
      result.raw = { provider: 'blockcypher', uri: 'https://api.blockcypher.com/v1', result: rawResult }
    return result
  }

  this.getTransactionDataAsync = async (transactionId, withRawResult = false) => {
    let targetUrl = `https://api.blockcypher.com/v1/btc/${networkName}/txs/${transactionId}?token=${blockcypherToken}`
    let options = { method: 'GET', url: targetUrl, resolveWithFullResponse: true }

    let response
    try {
      response = await rp(options)
    } catch (error) {
      if (error.statusCode) throw new Error(`Invalid response : ${error.statusCode} : ${JSON.parse(error.error).error}`)
      throw new Error(`No response received on getTransactionDataAsync : ${error.message}`)
    }

    let rawResult = JSON.parse(response.body)
    if (rawResult.error) throw new Error(rawResult.error)

    let time = Math.trunc(Date.parse(rawResult.received) / 1000)

    let blockTime = null
    if (rawResult.confirmed) blockTime = Math.trunc(Date.parse(rawResult.confirmed) / 1000)

    let valueOut = BigNumber(rawResult.total)
      .dividedBy(10 ** 8)
      .toNumber()
    let fees = BigNumber(rawResult.fees)
      .dividedBy(10 ** 8)
      .toNumber()
    let valueIn = BigNumber(valueOut)
      .plus(fees)
      .toNumber()

    let anchorValue = null
    if (rawResult.outputs) {
      anchorValue = rawResult.outputs.reduce((result, item) => {
        if (item.script_type === 'null-data') result = item.data_hex
        return result
      }, null)
    }

    let result = {
      txId: rawResult.hash,
      version: rawResult.ver,
      blockHash: rawResult.block_hash || null,
      blockHeight: rawResult.block_height || null,
      confirmations: rawResult.confirmations || 0,
      time: time,
      blockTime: blockTime,
      size: rawResult.size,
      valueIn: valueIn,
      valueOut: valueOut,
      fees: fees,
      anchorValue: anchorValue
    }
    if (withRawResult || globalReturnRawResult)
      result.raw = { provider: 'blockcypher', uri: 'https://api.blockcypher.com/v1', result: rawResult }
    return result
  }

  this.getBlockDataAsync = async (blockHeightOrHash, withRawResult = false) => {
    let baseUrl = `https://api.blockcypher.com/v1/btc/${networkName}/blocks/${blockHeightOrHash}?token=${blockcypherToken}`
    let limit = 500
    let start = 0

    let firstSegmentUrl = `${baseUrl}&txstart=${start}&limit=${limit}`

    let options = {
      method: 'GET',
      url: firstSegmentUrl,
      resolveWithFullResponse: true
    }

    let response
    try {
      response = await rp(options)
    } catch (error) {
      if (error.statusCode) throw new Error(`Invalid response : ${error.statusCode} : ${JSON.parse(error.error).error}`)
      throw new Error(`No response received on getBlockDataAsync : ${error.message}`)
    }

    let rawResult = JSON.parse(response.body)
    if (rawResult.error) throw new Error(rawResult.error)

    let result = {}
    result.hash = rawResult.hash
    result.height = rawResult.height
    result.size = rawResult.size
    result.version = rawResult.ver
    result.confirmations = rawResult.depth + 1
    result.merkleRoot = rawResult.mrkl_root
    result.nTx = rawResult.n_tx
    result.tx = rawResult.txids
    result.previousBlockHash = rawResult.prev_block
    result.time = Date.parse(rawResult.time) / 1000
    result.nonce = rawResult.nonce
    result.difficulty = bitsToDifficulty(rawResult.bits)

    // if there are more transaction ids to retrieve, do so in batches
    if (result.nTx > limit) {
      // create segment list for subsequest calls to get complete list of txids
      let segments = []
      for (let x = limit; x < result.nTx; x += limit) {
        segments.push(x)
      }

      for (let start of segments) {
        let currentSegmentUrl = `${baseUrl}&txstart=${start}&limit=${limit}`

        let options = {
          method: 'GET',
          url: currentSegmentUrl,
          resolveWithFullResponse: true
        }

        let response
        try {
          response = await rp(options)
        } catch (error) {
          if (error.statusCode)
            throw new Error(`Invalid response : ${error.statusCode} : ${JSON.parse(error.error).error}`)
          throw new Error(`No response received on getBlockDataAsync : ${error.message}`)
        }

        let apiResult = JSON.parse(response.body)
        if (apiResult.error) throw new Error(apiResult.error)

        result.tx = result.tx.concat(apiResult.txids)
      }
    }

    if (withRawResult || globalReturnRawResult)
      result.raw = { provider: 'blockcypher', uri: 'https://api.blockcypher.com/v1', result: rawResult }
    return result
  }

  this.getEstimatedFeeAsync = async (numBlocks, withRawResult = false) => {
    let targetUrl = `https://api.blockcypher.com/v1/btc/${networkName}?token=${blockcypherToken}`
    let options = { method: 'GET', url: targetUrl, resolveWithFullResponse: true }

    let response
    try {
      response = await rp(options)
    } catch (error) {
      if (error.statusCode) throw new Error(`Invalid response : ${error.statusCode} : ${JSON.parse(error.error).error}`)
      throw new Error(`No response received on getEstimatedFeeAsync : ${error.message}`)
    }

    let rawResult = JSON.parse(response.body)
    if (rawResult.error) throw new Error(rawResult.error)

    let feeRateSatPerKb = (() => {
      if (numBlocks > 6) return rawResult.low_fee_per_kb
      if (numBlocks > 2) return rawResult.medium_fee_per_kb
      return rawResult.high_fee_per_kb
    })()
    if (feeRateSatPerKb <= 0) throw new Error(`Invalid estimated fee value received: ${feeRateSatPerKb}`)
    let feeRateBtcPerKb = BigNumber(feeRateSatPerKb)
      .dividedBy(10 ** 8)
      .toNumber()

    let result = { feerate: feeRateBtcPerKb }

    if (withRawResult || globalReturnRawResult)
      result.raw = { provider: 'blockcypher', uri: 'https://api.blockcypher.com/v1', result: rawResult }
    return result
  }

  // *** PRIVATE SUPPORT FUNCTIONS  ***

  function bitsToDifficulty(bits) {
    let hexBits = bits.toString(16)
    let bitCount = parseInt(hexBits.slice(0, 2), 16)
    let bitTarget = hexBits.slice(2)
    let bitsNeeded = bitCount - bitTarget.length / 2

    let bitTargetInt = parseInt(bitTarget + '00'.repeat(bitsNeeded), 16)
    let genTargetInt = parseInt('00ffff0000000000000000000000000000000000000000000000000000', 16)
    let difficulty = BigNumber(genTargetInt)
      .dividedBy(bitTargetInt)
      .toNumber()

    return difficulty
  }
}

module.exports = blockcypher
module.exports.getInstance = opts => {
  return new blockcypher(opts)
}
