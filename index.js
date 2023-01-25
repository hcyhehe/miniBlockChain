const vorpal = require('vorpal')();
const Table = require('cli-table');
const Blockchain = require('./blockchain');
const blockchain = new Blockchain();
const rsa = require('./rsa');


// 格式化console.log
function formatLog(data) {
  if (!data || data.length===0) {
    return;
  }
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

vorpal.command('trans <to> <amount>', '转账').action(function(args, callback) {
  const { to, amount } = args;
  const from = rsa.keys.pub; //直接用公钥当作地址
  const trans = blockchain.transfer(from, to, amount);
  if (trans) {
    formatLog(trans);
  }
  callback();  //不加callback，执行完后会退出该命令行
});

vorpal.command('mine', '挖矿').action(function(args, callback) {
  const address = rsa.keys.pub; //直接用公钥当作地址
  const newBlock = blockchain.mine(address);
  if (newBlock) {
    formatLog(newBlock);
  }
  callback();
});

vorpal.command('blockchain', '查看区块链').action(function(args, callback) {
  formatLog(blockchain.blockchain);
  callback();
});

vorpal.command('detail <index>', '查看区块详情').action(function(args, callback) {
  const block = blockchain.blockchain[args.index];
  this.log(JSON.stringify(block));
  callback();
});

vorpal.command('balance', '查看余额').action(function(args, callback) {
  const address = rsa.keys.pub;
  const balance = blockchain.balance(address);
  if (balance) {
    formatLog({address, balance});
  }
  callback();
});

vorpal.command('pub', '查看钱包地址').action(function(args, callback) {
  this.log(rsa.keys.pub);
  callback();
});

vorpal.command('peers', '查看其他所有网络节点').action(function(args, callback) {
  formatLog(blockchain.peers);
  callback();
});

vorpal.command('chat <msg>', '跟其他节点聊天').action(function(args, callback) {
  blockchain.boardcast({ type:'hi', data: args.msg });
  callback();
});

console.log('welcome to miniBlockChain!');
vorpal.exec('help');  //打印帮助消息
vorpal
  .delimiter('miniBlockChain => ')
  .show();

