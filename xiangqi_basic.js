import http from 'k6/http';
import { sleep } from 'k6';
import ws from 'k6/ws';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { scenario } from 'k6/execution';
import { vu } from 'k6/execution';

const data = new SharedArray('some data name', function () {
  return JSON.parse(open('./data.json')).users;
});

export const options = {
  scenarios: {
    'use-all-the-data': {
      executor: 'shared-iterations',
      vus: 15,
      iterations: data.length,
      maxDuration: '50s',
    },
  },
};


function login(email, password){
    const url = 'https://api.xiangqi-dev.arbisoft.com/api/users/signin'
    const payload = JSON.stringify({
        // email: 'loadtest1',
        // password: 'edx',
        email: email,
        password: password,
      });
      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
    const resp = http.post(url, payload, params);
    console.log(resp.json('user.country'))
    const jwt = resp.json('access_token');
    sleep(1);
    return jwt
}

function getSID(jwt){
    let sid;
    const url = `https://api.xiangqi-dev.arbisoft.com//socket.io/?jwt=${jwt}&param=lobby&EIO=3&transport=polling&t=455632`
    const resp = http.get(url);
    const regex = /"sid":"([^"]+)"/;
    const match = resp.body.match(regex);
    if (match) {
        sid = match[1];
        return sid
      }
}

function connectNamespace(jwt, sid){
    const url = `https://api.xiangqi-dev.arbisoft.com/socket.io/?jwt=${jwt}&param=lobby&EIO=3&transport=polling&t=455632&sid=${sid}`
    const payload = `349:40/xiangqi?jwt=${jwt}&param=lobby`
    
    const resp = http.post(url, payload);
}

function simpleGet(jwt, sid) {
    const url = `https://api.xiangqi-dev.arbisoft.com/socket.io/?jwt=${jwt}&param=lobby&EIO=3&transport=polling&t=455632&sid=${sid}`
    const resp = http.get(url)
    
}

function createCustomGame(jwt){

  const url = 'https://api.xiangqi-dev.arbisoft.com/api/games/create-custom'
  const payload = JSON.stringify({
    "game_time": 10,
    "increment": 0,
    "is_daily": false,
    "is_private": false,
    "is_rated": true,
    "is_timed": true,
    "move_time": 2,
    "opponent": null,
    "opponent_email": null,
    "side": 2
  });
    
  const params = {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'content-type': 'application/json'
    },
  };
  const resp = http.post(url, payload, params);
  console.log(resp.json('game_id'))
    // const jwt = resp.json('access_token');
  sleep(1);
  return jwt

}

function websocketOpen(jwt, sid){
    const url = `wss://api.xiangqi-dev.arbisoft.com/socket.io/?jwt=${jwt}&param=lobby&EIO=3&transport=websocket&sid=${sid}`;
    const params = {
        headers: {
          'Host': 'api.xiangqi-dev.arbisoft.com',
          'Origin': 'https://xiangqi-dev.arbisoft.com',
        },
      };
    
    
      const res = ws.connect(url, params, function (socket) {
        socket.on('open', () => console.log('connected'));
        
        
        socket.send("2probe")
        socket.on('message', function(message) {
          console.log("Received message: " + message);
        });
        
        socket.send("5")
        socket.on('message', function(message) {
          console.log("Received message: " + message);
        });

        socket.on('close', () => console.log('disconnected'));
      });
}


export default function () {
  const user = data[scenario.iterationInTest];
  const email = JSON.stringify(user.email)
  const password = JSON.stringify(user.password)


  const jwt = login(JSON.parse(email), 'edx');
  // const jwt = login('loadtest8', 'edx');
  const sid = getSID(jwt);
  connectNamespace(jwt, sid)
  simpleGet(jwt, sid)
  websocketOpen(jwt, sid)
  // createCustomGame(jwt)
  }