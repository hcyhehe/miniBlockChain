// 1. 区块链的生成、新增和校验
// 2. 交易
// 3. 非对称加密
// 4. 挖矿
// 5. p2p网络

const crypto = require('crypto');
const dgram = require('dgram');
const rsa = require('./rsa');

// 创世区块
const initBlock = {
  index: 0,
  data: 'Hello blockchain!',
  prevHash: '0',
  timestamp: 1674547193415,
  nonce: 21057,
  hash: '0000f047359b7ee9c327498a7db176c65e7f56e30e09c71d3a7b5902063815a1'
};

class Blockchain {
  constructor() {
    this.blockchain = [initBlock];  //区块链条
    this.data = []; //区块内容
    this.difficulty = 4; //区块难度，比如要求hash值的前面为4个0才符合条件
    this.prize = 100;  //矿工每次挖矿成功的奖励
    this.peers = []; //所有网络节点的信息：address+port
    this.seed = { //种子节点
      address: '139.9.65.44',
      // address: 'localhost',
      port: 8001 
    };
    this.remote = {};
    this.udp = dgram.createSocket('udp4');
    this.init();
  }

  init() {
    this.bindP2p();
    this.bindExit();
  }

  bindP2p() {
    this.udp.on('message', (data, remote) => {
      const { address, port } = remote;
      const action = JSON.parse(data);
      if (action.type) {
        this.dispatch(action, {address, port}); //触发对应动作
      }
    });
    this.udp.on('listening', () => {
      const address = this.udp.address();
      console.log('[信息] UDP监听完毕：' + address.address + ':' + address.port);
    });
    // 区分种子节点和普通节点，种子节点的端口是固定的，普通节点的端口可以是任意的
    const port = Number(process.argv[2]) || 0;
    this.startNode(port); //启动节点
  }

  startNode(port) {
    this.udp.bind(port);
    //启动的时候，如果不加端口号参数，则默认为普通节点；如果端口号参数为this.seed.port，则为种子节点
    if (port !== 8001) {
      this.send({ //普通节点向种子节点发送消息
        type: 'newPeer'
      }, this.seed.port, this.seed.address);
      this.peers.push(this.seed);  //把种子节点加入到网络节点中
    }
  }

  send(message, port, host) {
    this.udp.send(JSON.stringify(message), port, host);
  }
  boardcast(action) { //广播所有节点
    this.peers.forEach(v => {
      this.send(action, v.port, v.address);
    });
  }

  dispatch(action, remote) { //处理接受到的消息
    switch(action.type){
      case 'newPeer':
        //种子节点要做的事情：
        //1.告知种子节点的ip和port
        this.send({type: 'remoteAddress', data: remote}, remote.port, remote.address);
        //2.当前全部节点的列表
        this.send({type: 'peerList', data: this.peers}, remote.port, remote.address);
        //3.告知已有节点，加入了新节点
        this.boardcast({ type: 'sayhi', data: remote });
        //4.告知当前区块链数据
        this.send({
          type: 'blockchain',
          data: JSON.stringify({ 
            blockchain: this.blockchain, 
            trans: this.data 
          })
        }, remote.port, remote.address);
        this.peers.push(remote);
        console.log('[信息][种子] 有新节点加入', remote);
        break;
      case 'blockchain':
        let allData = JSON.parse(action.data);
        let newChain = allData.blockchain;
        let newTrans = allData.trans;
        this.replaceChain(newChain);
        this.replaceTrans(newTrans);
        break;
      case 'remoteAddress':
        this.remote = action.data; //存储远程消息，退出的时候用
        break;
      case 'peerList': //节点列表
        const newPeers = action.data;
        this.addPeers(newPeers);
        break;
      case 'sayhi':
        const remotePeer = action.data;
        this.peers.push(remotePeer);
        console.log('[信息][普通] 有新节点加入');
        this.send({type:'hi', data:'hi'}, remotePeer.port, remotePeer.address);
        break;
      case 'hi':
        console.log(`来自节点${remote.address}:${remote.port}的信息: ${action.data}`);
        break;
      case 'mine': //网络上有节点挖矿成功
        const lastBlock = this.getLastBlock();
        if (lastBlock.hash === action.data.hash) { //判断是否重复添加
          return;
        }
        if (this.isValidateBlock(action.data, lastBlock)) { //判断该区块是否合法
          console.log('[信息] 有节点挖矿成功！');
          this.blockchain.push(action.data);
          this.data = []; //清空交易信息
          this.boardcast({ type: 'mine', data: action.data }); //将挖矿成功的消息广播至其他节点
        } else {
          console.log('[信息] 挖矿的区块不合法！');
        }
        break;
      case 'trans': //网络收到的交易请求
        if (!this.data.find(v => this.isEqualObj(v, action.data))) { //判断是否有重复的交易
          console.log('[信息] 有新的交易生成');
          this.addTrans(action.data);
          this.boardcast({ type: 'trans', data: action.data });
        }
        break;
      default:
        console.log('未识别action');
    }
  }

  isEqualObj(obj1, obj2) { //判断obj是否一致
    const key1 = Object.keys(obj1);
    const key2 = Object.keys(obj2);
    if(key1.length !== key2.length) return;
    return key1.every(key => obj1[key]===obj2[key]);
  }
  // isEqualPeer(peer1, peer2) { //判断节点
  //   return peer1.address==peer2.address && peer1.port===peer2.port;
  // }
  addPeers(peers) {
    peers.forEach(peer => {
      if (!this.peers.find(v => this.isEqualObj(peer, v))) { //节点去重
        this.peers.push(peer);
      }
    });
  }

  bindExit() {
    process.on('exit', () => {
      console.log('[信息] 您已退出该服务，886~');
    });
  }

  // 挖矿，其实就是将交易信息打包到区块里面
  mine(address) {
    this.data = this.data.filter(v => this.isValidTransfer(v)); //过滤不合法的交易信息

    this.transfer('0', address, this.prize); // 挖矿结束，矿工奖励

    //1.生成新区块
    //2.不停地计算哈希，直到算出符合难度条件的哈希值，然后获得记账权
    const newBlock = this.generateNewBlock();
    //3.新增的区块以及先前整个区块链要检验是否合法，若合法，将其新增到链上
    if(this.isValidateBlock(newBlock) && this.isValidateChain()){
      this.blockchain.push(newBlock);
      this.data = []; //清空转账信息
      this.boardcast({ type: 'mine', data: newBlock });
      return newBlock;
    } else {
      console.log('Error, Invalid Block: ', newBlock);
    }
  }

  // 生成新区块
  generateNewBlock() {
    let { length } = this.blockchain;
    let nonce = 0;
    const index = length;
    const prevHash = this.getLastBlock().hash;
    const timestamp = new Date().getTime();
    const data = this.data;
    const len = this.difficulty;
    let hash = this.computeHash(index, prevHash, timestamp, data, nonce);
    const diffStr = '0'.repeat(len);
    while (hash.slice(0, len) !== diffStr) {
      nonce += 1;
      hash = this.computeHash(index, prevHash, timestamp, data, nonce);
    }
    return {index, data, prevHash, timestamp, nonce, hash};
  }

  // 获取最新区块
  getLastBlock() {
    return this.blockchain[this.blockchain.length-1];
  }

  // 计算哈希
  computeHash(index, prevHash, timestamp, data, nonce) {
    return crypto.createHash('sha256').update(index + prevHash + timestamp + data + nonce).digest('hex');
  }

  computeHashForBLock({index, prevHash, timestamp, data, nonce}) {
    return this.computeHash(index, prevHash, timestamp, data, nonce);
  }

  // 校验区块
  isValidateBlock(newBlock, lastBlock = this.getLastBlock()) {
    //1.当前生成区块的index = 上一个区块的index+1
    //2.当前生成区块的timestamp > 上一个区块的timestamp
    //3.当前生成区块的prevHash = 上一个区块的hash
    //4.当前生成区块的hash符合难度要求
    //5.当前生成区块的hash计算是正确的
    const diff = this.difficulty;
    if (newBlock.index !== lastBlock.index + 1) {
      return false;
    } else if (newBlock.timestamp <= lastBlock.timestamp) {
      return false;
    } else if (newBlock.prevHash !== lastBlock.hash) {
      return false;
    } else if (newBlock.hash.slice(0, diff) !== '0'.repeat(diff)) {
      return false;
    } else if (newBlock.hash !== this.computeHashForBLock(newBlock)) {
      return false;
    }
    return true;
  }

  // 校验整个区块链
  isValidateChain(chain = this.blockchain) {
    //将区块链倒序遍历，除了创世区块
    for (let i=chain.length-1;i>=1;i--) {
      if (!this.isValidateBlock(chain[i], chain[i-1])) {
        return false
      }
    }
    //校验创世区块
    if(JSON.stringify(chain[0]) !== JSON.stringify(initBlock)){
      return false;
    }
    return true;
  }

  //新链替换老链
  replaceChain(newChain) {
    if (newChain.length === 1) { //创世区块不校验
      return;
    }
    if (this.isValidateChain(newChain) && newChain.length > this.blockchain.length) {
      this.blockchain = JSON.parse(JSON.stringify(newChain));
    } else {
      console.log('[错误] 不合法链！');
    }
  }

  // 交易
  transfer(from, to, amount) {
    // 签名校验
    const timestamp = new Date().getTime();
    const signature = rsa.sign({ from, to, amount, timestamp });
    const sigTrans = { from, to, amount, timestamp, signature };

    if (from!=='0') { //该交易并非挖矿
      const balance = this.balance(from);
      if (balance < amount) { //判断余额是否充足
        console.log('Your balance is not enough!', balance);
        return false;
      }
      this.boardcast({ type: 'trans', data: sigTrans });
    }
   
    this.data.push(sigTrans);
    return sigTrans;
  }

  // 验证是否为合法转账，地址为公钥
  isValidTransfer(trans) {
    const res = rsa.verify(trans, trans.from);
    return res;
  }

  //添加交易信息
  addTrans(trans) {
    if (this.isValidTransfer(trans)) {
      this.data.push(trans);
    }
  }

   //新交易替代老交易
   replaceTrans(trans) {
    if (trans.every(v => this.isValidTransfer(v))) {
      this.data = trans;
    }
  }

  // 查询余额
  balance(address) {
    // from to transfer
    let balance = 0;
    this.blockchain.forEach(block => {
      if (!Array.isArray(block.data)) {
        return; //创世区块
      }
      block.data.forEach(trans => {
        if (address === trans.from) {
          balance -= trans.amount;
        }
        if (address === trans.to) {
          balance += trans.amount;
        }
      });
    });
    console.log(balance);
    return balance;
  }

}

module.exports = Blockchain;
