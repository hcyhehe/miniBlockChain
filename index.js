const vorpal = require('vorpal')();
const Table = require('cli-table');
const Blockchain = require('./blockchain');
const blockchain = new Blockchain();


// 格式化console.log
function formatLog(data) {
  if (!Array.isArray(data)) {
    data = [data];
  }
  const first = data[0];
  const head = Object.keys(first);
  const table = new Table({
    head,
    colWidths: new Array(head.length).fill(20)
  });
  const res = data.map(v => {
    return head.map(h => JSON.stringify(v[h], null, 1));
  });
  table.push(...res);
  console.log(table.toString());
}

vorpal.command('trans <from> <to> <amount>', '转账').action(function(args, callback) {
  const { from, to, amount } = args;
  const trans = blockchain.transfer(from, to, amount);
  if (trans) {
    formatLog(trans);
  }
  callback();  //不加callback，执行完后会退出该命令行
});

vorpal.command('mine <address>', '挖矿').action(function(args, callback) {
  const newBlock = blockchain.mine(args.address);
  if (newBlock) {
    formatLog(newBlock);
  }
  callback();
});

vorpal.command('chain', '查看区块链').action(function(args, callback) {
  formatLog(blockchain.blockchain);
  callback();
});

vorpal.command('detail <index>', '查看区块详情').action(function(args, callback) {
  const block = blockchain.blockchain[args.index];
  this.log(JSON.stringify(block));
  callback();
});

vorpal.command('balance <address>', '查看余额').action(function(args, callback) {
  const balance = blockchain.balance(args.address);
  if (balance) {
    formatLog({address: args.address, balance});
  }
  callback();
});

console.log('welcome to miniBlockChain!');
vorpal.exec('help');  //打印帮助消息
vorpal
  .delimiter('miniBlockChain => ')
  .show();

