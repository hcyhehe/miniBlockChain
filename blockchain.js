// 1. 区块链的生成、新增和校验
// 2. 交易
// 3. 非对称加密
// 4. 挖矿
// 5. p2p网络


const crypto = require('crypto');

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
  }

  // 挖矿
  mine() {
    //1.生成新区块
    //2.不停地计算哈希，直到算出符合难度条件的哈希值，然后获得记账权
    const newBlock = this.generateNewBlock();
    //3.新增的区块以及先前整个区块链要检验是否合法，若合法，将其新增到链上
    if(this.isValidateBlock(newBlock) && this.isValidateChain()){
      this.blockchain.push(newBlock);
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
    const prevHash = this.getLastBlockchain().hash;
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
  getLastBlockchain() {
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
  isValidateBlock(newBlock, lastBlock = this.getLastBlockchain()) {
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
}

module.exports = Blockchain;
