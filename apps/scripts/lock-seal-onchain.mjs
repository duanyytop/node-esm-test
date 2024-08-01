import { lockScriptFromBtcTimeLockArgs } from '@rgbpp-sdk/ckb'
import { scriptToAddress } from "@nervosnetwork/ckb-sdk-utils"

const u128LeHexStringToBigInt = (hexString) => {
  const hex = hexString.replace(/^0x/, '')
  if (hex.length !== 32) {
    throw new Error('Input hex string must be 32 characters long (128 bits)')
  }
  const beHexString = hex.match(/.{2}/g).reverse().join('')
  return BigInt(`0x${beHexString}`)
}

const u32LeHexStringToNumber = (hexString) => {
  const hex = hexString.replace(/^0x/, '')
  if (hex.length !== 8) {
    throw new Error('Input hex string must be 8 characters long (32 bits)')
  }
  const beHexString = hex.match(/.{2}/g).reverse().join('')
  return Number(`0x${beHexString}`)
}

const formatNumber = (num) => {
  const int = BigInt(num) / BigInt(10 ** 8) 
  const deciml = BigInt(num) % BigInt(10 ** 8) 
  return `${int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${deciml}`;
}


const run = async () => {
  const response = await fetch('https://mainnet.ckb.dev', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'id': 2,
      'jsonrpc': '2.0',
      'method': 'get_cells',
      'params': [
        {
          'script': {
            'code_hash': '0x70d64497a075bd651e98ac030455ea200637ee325a12ad08aff03f1a117e5a62',
            'hash_type': 'type',
            'args': '0x'
          },
          'script_type': 'lock',
          'script_search_mode': 'prefix',
          'with_data': true,
          "filter": {
                "script": {
                    "code_hash": "0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95",
                    "hash_type": "data1",
                    "args": "0x2ae639d6233f9b15545573b8e78f38ff7aa6c7bf8ef6460bf1f12d0a76c09c4e"
                }
            }
        },
        'asc',
        '0x6000'
      ]
    })
  });
  const data = await response.json()
  const cells = data.result.objects

  console.log(`The number of seals from BTC Time cells is ${cells.length}.`)

  const stakedCells = cells.filter(cell => {
    const args = cell.output.lock.args
    const after = args.substring(args.length - 72 ,args.length - 64)
    return u32LeHexStringToNumber(after) >= 1008
  })

  const stakedAddresses = stakedCells.map(cell => ({
    ckbAddress: scriptToAddress(
        lockScriptFromBtcTimeLockArgs(cell.output.lock.args),
    ),
    stake: u128LeHexStringToBigInt(cell.output_data)
  }))
  const ckbAddressSet = new Set(stakedAddresses.map(cell => cell.ckbAddress))
  console.log(`The number of ckb addresses is ${ckbAddressSet.size}.`)

  const uniqueStakes = []
  for (const ckbAddress of ckbAddressSet) {
    uniqueStakes.push({
      ckbAddress,
      stake: stakedAddresses.filter(stake => stake.ckbAddress === ckbAddress).map(stake => stake.stake).reduce((prev, curr) => prev + curr, BigInt(0)).toString()
    })
  }
  console.log("The first 5 stakes", JSON.stringify(uniqueStakes.slice(0, 5)))

  const sealTotal = uniqueStakes.map(stake => BigInt(stake.stake)).reduce((prev, curr) => prev + curr, BigInt(0))
  console.log("The amount of seals from staking cells", formatNumber(sealTotal))
}

run()