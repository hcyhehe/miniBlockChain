const dgram = require('dgram');
const udp = dgram.createSocket('udp4'); //创建udp连接

//udp收信息
udp.on('message', (data, remote) => {
  console.log('Accept message: ' + data.toString());
  console.log(remote);
});
udp.on('listening', () => {
  const address = udp.address();
  console.log('UDP server is listening ' + address.address + ':' + address.port);
});
udp.bind(8006); //0:随机分配端口

function send(message, port, host) {
  console.log('send message: ', message, port, host);
  udp.send(Buffer.from(message), port, host);
}


//cmd界面把port 和 host两个参数传入
const port = Number(process.argv[2]);
const host = process.argv[3];
if (port && host) {
  send('Hello', port, host);
}


