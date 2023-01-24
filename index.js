const vorpal = require('vorpal')();

vorpal
  .command('mine', '挖矿')
  .action(function(args, callback) {
    this.log(args, callback);
    callback();
  });

console.log('welcome to miniBlockChain!');
vorpal.exec('help');  //打印帮助消息
vorpal
  .delimiter('miniBlockChain => ')
  .show();

