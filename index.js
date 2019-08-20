const _ =require('co-lodash');
const { Readable } = require('stream');

class Web3EventStream extends Readable {
  constructor(web3, evt, filter, opt) {
    super({ objectMode: true });

    const loadEvents = async (fromBlock, toBlock) => {
      for (let i = fromBlock; i <= toBlock; i += 64) {
        let events;

        for (let retry = 0; !events && retry < (opt.maxRetry || 3); retry++) {
          try {
            events = await new Promise((resolve, reject) => {
              const e = evt(
                filter,
                { fromBlock: i, toBlock: Math.min(i + 63, toBlock) }
              );

              e.get((err, results) => {
                if (err) reject(err);
                else resolve(results);

                e.stopWatching(() => {});
              });
            });
          } catch (e) {
            console.error('web3-stream retry from error:', e.message);
          }
        }

        for (const event of events) {
          if (!this.push(event)) {
            await new Promise(resolve => this._resume = resolve);
          }
        }
      }
    };

    const getBlockNumber = async () => {
      const blockNumber = await web3.eth.getBlockNumber();
      return blockNumber - (parseInt(opt.confirm) || 0);
    };

    (async () => {
      const blockNumber = await getBlockNumber();
      let fromBlock = opt.fromBlock < 0 ? blockNumber + opt.fromBlock : opt.fromBlock;
      let toBlock = parseInt(opt.toBlock) || blockNumber;

      await loadEvents(fromBlock, toBlock);

      if (opt.toBlock === 'latest' || !opt.toBlock) {
        while (!!this._read) { // same as while(true), to avoid warning in webstorm.
          const blockNumber = await getBlockNumber();

          if (blockNumber > toBlock) {
            fromBlock = toBlock + 1;
            toBlock = blockNumber;
            await loadEvents(fromBlock, toBlock);
          } else {
            await _.sleep(1000);
          }
        }
      } else {
        this.push(null);
      }
    })();
  }

  _read() {
    const resume = this._resume;
    delete this._resume;
    resume && resume();
  }
}

exports.Web3EventStream = Web3EventStream;