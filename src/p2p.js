const WebSockets = require("ws"),
  BlockChain = require('./blockchain');
const {getNewestBlock, isBlockStructureValid, replaceChain} = BlockChain;
const sockets = [];
const getSockets = () => sockets;

const GET_LATEST = "GET_LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

const getLatest = () => {
  return {
    type:GET_LATEST,
    data:null
  };
}
const getAll = () => {
  return {
    type : GET_ALL,
    data : null
  };
}
const blockchainResponse = data => {
  return {
    type:BLOCKCHAIN_RESPONSE,
    data:data
  };
}

const startP2PServer = server => {
  const wsServer = new WebSockets.Server({ server });
  wsServer.on("connection", ws => {
    console.log(`Hello Socket!`);
    initSocketConnection(ws);
  });
  console.log("Nomadcoin P2P Server running");
};

//Socket을 연결할때는 array에 추가하고, message다루고, error다룬다.
const initSocketConnection = ws => {  //connection이 있을때, 모든 서버가 체크함
  sockets.push(ws);
  handleSocketMessage(ws);
  handleSocketError(ws);
  sendMessage(ws,getLatest());
}; //getLatest : 명령어의 종류 -> 아마 이것을 다양화할것 같음

//JSON형태로 parsing해서 보낸다.
const parseData = data => {
  try{
    return JSON.parse(data);
  }
  catch(e){
    console.log(e);
    return null;
  }
}


//ws에서 문자열로 보내야 JSON으로 간다.
const sendMessage = (ws, message) => {
  ws.send(JSON.stringify(message));
}

const handleBlockchainResponse = receivedBlocks => {
  if (receivedBlocks.length === 0) {
    console.log("Received blocks have a length of 0");
    return;
  }
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  if (!isBlockStructureValid(latestBlockReceived)) {
    console.log("The block structure of the block received is not valid");
    return;
  }
  const newestBlock = getNewestBlock();
  if (latestBlockReceived.index > newestBlock.index) {
    if (newestBlock.hash === latestBlockReceived.previousHash) {
      if (addBlockToChain(latestBlockReceived)) {
        broadcastNewBlock();
      }
    } else if (receivedBlocks.length === 1) {
      sendMessageToAll(getAll());
    } else {
      replaceChain(receivedBlocks);
    }
  }
};

const handleSocketMessage = ws => {
  ws.on('message', data=>{
    const message = parseData(data);
    if(message == null)
    {
      return;
    }
    console.log(message);
    switch(message.type){
      case GET_LATEST:  //마지막 블록을 나타내라는 명령어이므로 getLastBlock()을 전송
        console.log(JSON.stringify(getLastBlock()));  //우리 정보를 출력
        sendMessage(ws,getLastBlock());               //ws의 반대쪽에 우리정보를 전송
        break;
      case GET_ALL:
        sendMessage(ws, responseAll());
        break;
      case BLOCKCHAIN_RESPONSE:
        const receivedBlocks = message.data;
        if (receivedBlocks === null) {
          break;
        }
        handleBlockchainResponse(receivedBlocks);
        break;
    }
  });
};

const handleSocketError = ws => {
    const closeSocketConnection = ws => {
        ws.close();
        sockets.splice(sockets.indexOf(ws),1);
    }
    ws.on("close",()=>closeSocketConnection(ws));
    ws.on("error",()=>closeSocketConnection(ws));
};

const connectToPeers = newPeer => {
  console.log(newPeer);
  const ws = new WebSockets(newPeer);
  ws.on("open", () => {
    initSocketConnection(ws);
  });
};

module.exports = {
  startP2PServer,
  connectToPeers
};