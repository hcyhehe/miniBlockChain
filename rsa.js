// 1.生成公私钥对
// 2.公钥可以通过私钥计算出来
// 3.公钥前20位当地址用

const fs = require('fs');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
let keypair = ec.genKeyPair();


// 1.获取公私钥对（持久化）
function generateKeys() {
  const fileName = './wallet.json';
  try{
    const res = JSON.parse(fs.readFileSync(fileName));
    if (res.pub && res.prv && getPub(res.prv)===res.pub) { //公私钥都存在，且通过私钥计算的结果等于公钥
      keypair = ec.keyFromPrivate(res.prv);
      return res;
    } else {
      throw 'Not valid wallet.json!';
    }
  } catch(e) {
    //文件不存在或文件内容不合法，重新生成
    const res = {
      prv: keypair.getPrivate('hex').toString(),  //私钥
      pub: keypair.getPublic('hex').toString()  //公钥
    };
    fs.writeFileSync(fileName, JSON.stringify(res));
    return res;
  }
}
const keys = generateKeys();

function getPub(prv) { //根据私钥计算出公钥
  return ec.keyFromPrivate(prv).getPublic('hex').toString();
}

// 2.签名
function sign({from, to, amount}) {
  const bufferMsg = Buffer.from(`${from}-${to}-${amount}`); //转账信息拼接后转成二进制
  let signature = Buffer.from(keypair.sign(bufferMsg).toDER()).toString('hex');
  return signature;
}

// 3.验证签名
function verify({from, to, amount, signature}, pub) {
  // 校验是没有私钥的
  const keypairTemp = ec.keyFromPublic(pub, 'hex');
  const bufferMsg = Buffer.from(`${from}-${to}-${amount}`);
  return keypairTemp.verify(bufferMsg, signature);
}


const trans = {from:'hcy', to:'xixi', amount:100};
const trans1 = {from:'hcy1', to:'xixi', amount:100};
const signature = sign(trans);
trans.signature = signature;
trans1.signature = signature;
console.log(trans1);
const isVerify = verify(trans1, keys.pub);
console.log(isVerify);
