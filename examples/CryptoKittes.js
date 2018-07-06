// List all crypto kitties Transfer event.
const cs = require('co-stream');
const Web3Wallet = require('web3-wallet');
const { Web3EventStream } = require('../');

const url = 'https://api.myetherapi.com/eth';
const contractAddr = '0x06012c8cf97bead5deae237070f9587f8e7a266d';

const web3 = Web3Wallet.create(null, url);
const CK = web3.eth.loadContract(require('./CryptoKittes.json'), contractAddr);

const fromBlock = 4605167;

(async function () {
  (new Web3EventStream(web3, CK.Transfer, {}, { fromBlock }))
    .pipe(cs.object.each(evt => {
      const { blockNumber, args } = evt;
      args.tokenId = args.tokenId.toString();
      console.log('Block #' + blockNumber, args);
    }));
})().catch(console.error);