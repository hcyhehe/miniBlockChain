const vorpal = require('vorpal')();
const Blockchain = require('./blockchain');
const blockchain = new Blockchain();

vorpal.command('mine', '挖矿').action(function(args, callback) {
  const newBlock = blockchain.mine();
  if (newBlock) {
    this.log(newBlock);
  }
  callback();
});

vorpal.command('chain', '查看区块链').action(function(args, callback) {
  this.log(blockchain.blockchain);
  callback();
});

console.log('welcome to miniBlockChain!');
vorpal.exec('help');  //打印帮助消息
vorpal
  .delimiter('miniBlockChain => ')
  .show();

