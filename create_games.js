import http from 'k6/http';
import { sleep } from 'k6';
import ws from 'k6/ws';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { scenario, exec } from 'k6/execution';
import { vu } from 'k6/execution';

const gameCreators = new SharedArray('some data name', function () {
  return JSON.parse(open('./gameCreators.json')).users;
});

const gameJoiners = new SharedArray('game joiners', function () {
  return JSON.parse(open('./gameJoiners.json')).users;
})


export const options = {
  scenarios: {
    'create_games': {
      exec: 'CreateGames',
      executor: 'shared-iterations',
      vus: 5,
      iterations: gameCreators.length,
      maxDuration: '15000s',
      gracefulStop: '6000s',
      startTime: "0s",
    },
    'join_games': {
      exec: 'JoinGames',
      executor: 'shared-iterations',
      vus: 5,
      iterations: gameJoiners.length,
      maxDuration: '15000s',
      gracefulStop: '6000s',
      startTime: "5s",
    }
  }
};


function login(email, password) {
  const url = 'https://api.xiangqi-dev.arbisoft.com/api/users/signin'
  const payload = JSON.stringify({
    email: email,
    password: password,
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const resp = http.post(url, payload, params);
  console.log(email, ': ', resp.json('access_token'))
  const jwt = resp.json('access_token');
  sleep(1);
  return jwt
}

function getSID(jwt) {
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

function connectNamespace(jwt, sid) {
  const url = `https://api.xiangqi-dev.arbisoft.com/socket.io/?jwt=${jwt}&param=lobby&EIO=3&transport=polling&t=455632&sid=${sid}`
  const payload = `349:40/xiangqi?jwt=${jwt}&param=lobby`

  const resp = http.post(url, payload);
}

function simpleGet(jwt, sid) {
  const url = `https://api.xiangqi-dev.arbisoft.com/socket.io/?jwt=${jwt}&param=lobby&EIO=3&transport=polling&t=455632&sid=${sid}`
  const resp = http.get(url)

}

function createCustomGame(jwt) {

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
    "side": 1
  });

  const params = {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'content-type': 'application/json'
    },
  };
  const resp = http.post(url, payload, params);
  //console.log('gameID: ', resp.json('game_id'))
  const gameID = resp.json('game_id');
  sleep(1);
  return gameID

}

function websocketOpen(jwt, sid) {
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
    socket.on('message', function (message) {
      console.log("Received message: " + message);
    });

    socket.send("5")
    socket.on('message', function (message) {
      console.log("Received message: " + message);
    });

    socket.on('close', () => console.log('disconnected'));
  });
}

function getGameSocket(jwt, gameID) {
  let sid;
  const unique = Math.floor(Math.random() * 10000) + 1
  const url = `https://api.xiangqi-dev.arbisoft.com/socket.io/?jwt=${jwt}&param=${gameID}&EIO=3&transport=polling&t=${unique}`;
  const resp = http.get(url);
  const regex = /"sid":"([^"]+)"/;
  const match = resp.body.match(regex);
  if (match) {
    sid = match[1];
    return sid
  }
}

function connectGameNamespace(jwt, sid, gameID) {
  const unique = Math.floor(Math.random() * 10000) + 1
  const url = `https://api.xiangqi-dev.arbisoft.com/socket.io/?jwt=${jwt}&param=${gameID}&EIO=3&transport=polling&t=${unique}&sid=${sid}`
  const payload = `349:40/xiangqi?jwt=${jwt}&param=${gameID}`

  const resp = http.post(url, payload);
}

function gameSocketOpen(jwt, user, sid, gameID, move, conn) {
  const url = `wss://api.xiangqi-dev.arbisoft.com/socket.io/?jwt=${jwt}&param=${gameID}&EIO=3&transport=websocket&sid=${sid}`;
  const params = {
    headers: {
      'Host': 'api.xiangqi-dev.arbisoft.com',
      'Origin': 'https://xiangqi-dev.arbisoft.com',
    },
  };


  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => console.log('connected'));

    socket.send("2probe")
    socket.on('message', function (message) {
      console.log("Received message: " + message);
    });

    socket.send("5")
    socket.on('message', function (message) {
      console.log("Received message: " + message);
    });

    let time = 5000
    for (let i = 0; i < 5; i++) {
      socket.setTimeout(function () {
        socket.send("2probe")
        socket.on('message', function (message) {
          console.log("Received message: " + message);
        });

        socket.send("5")
        socket.on('message', function (message) {
          console.log("Received message: " + message);
        });
      }, time)
      time += 5000
    }

    socket.send(`42/xiangqi,["game.get",{"game_id":"${gameID}"}]`)
    socket.on('message', function (message) {
      console.log("Received message: " + message);
    });

    socket.send(`42/xiangqi,["chat.new.message",{"sender_name":"${user.email.replace('@xiangqi.com', '')}","message": "Hi My name is ${user.email.replace('@xiangqi.com', '')}", "game_id": "${gameID}"}]`)
    socket.on('message', function (message) {
      console.log("Received message: " + message);
    });



    if (conn == 2) {
      socket.setTimeout(function () {
        socket.send(`42/xiangqi,["game.move",{"game_id":"${gameID}","move":"${move}","thinking_time": 2}]`)
        socket.on('message', function (message) {
          console.log("Received message: " + message + ' ' + user.email + ' ' + __VU);
        });
      }, 20000)
    }
    else {
      socket.send(`42/xiangqi,["game.move",{"game_id":"${gameID}","move":"${move}","thinking_time": 2}]`)
      socket.on('message', function (message) {
        console.log("Received message: " + message + ' ' + user.email + ' ' + __VU);
      });
    }

    socket.send(`42/xiangqi,["game.finish",{"game_id":"${gameID}","reason":300}]`)
    socket.on('message', function (message) {
      console.log("Received message: " + message + ' ' + user.email + ' ' + __VU);
    });



    socket.on('close', () => console.log(`${user.email} disconnected`));
  });
}


export function CreateGames() {
  const user = gameCreators[scenario.iterationInTest];
  console.log(user.email)
  const email = JSON.stringify(user.email)
  const password = JSON.stringify(user.password)
  const jwt = login(JSON.parse(email), 'edx');
  const sid = getSID(jwt);
  connectNamespace(jwt, sid)
  simpleGet(jwt, sid)
  websocketOpen(jwt, sid)
  const currentGameID = createCustomGame(jwt)
  http.post('http://localhost:5000/data', currentGameID)
  const gameSid = getGameSocket(jwt, currentGameID);
  connectGameNamespace(jwt, gameSid);
  gameSocketOpen(jwt, user, gameSid, currentGameID, "g4g5", 1)
}

export function JoinGames() {
  const user = gameJoiners[scenario.iterationInTest];
  console.log(user.email)
  const email = JSON.stringify(user.email)
  const password = JSON.stringify(user.password)
  const jwt = login(JSON.parse(email), 'edx');
  const sid = getSID(jwt);
  connectNamespace(jwt, sid)
  simpleGet(jwt, sid)
  websocketOpen(jwt, sid)

  const gameID = http.get('http://localhost:5000/data').body.replace('\n', '');
  const gameSid = getGameSocket(jwt, gameID);
  connectGameNamespace(jwt, gameSid);
  console.log(gameID, '\n')
  gameSocketOpen(jwt, user, gameSid, gameID, "b8e8", 2);
  http.post('http://localhost:5000/clear')
}
