const API= "https://openapi.vjoi.cn";
const app_id = "1719638224994";

class Game {
  user_code = "";
  game_id = "";
  ws = null;
  handler = null;

  constructor(user_code, handler) {
    this.user_code = user_code;
    this.handler = handler;
  }

  static verify(caller, code, mid, timestamp, code_sign, handler) {
    console.log("Verify params");
    // GET /v2/app/verify
    fetch(API + "/v2/app/verify?Caller=" + caller + "&Code=" + code + "&Mid=" + mid + "&Timestamp=" + timestamp + "&CodeSign=" + code_sign)
      .then(response => response.json())
      .then(data => {
        handler(data.code);
      })
      .catch(error => {
        console.error(error);
      })
  }

  startGame() {
    console.log("Game started");
    // GET /v2/app/start
    fetch(API+ "/v2/app/start?app_id=" + app_id + "&user_code=" + this.user_code)
      .then(response => response.json())
      .then(data => {
        if (data.code == 0) {
          const res = data.data;
          const { game_info, websocket_info } = res;
          const { auth_body, wss_link } = websocket_info;
          const wsConfig = this.getWebSocketConfig(auth_body, wss_link);
          const opt = {
            ...wsConfig,
            onReceivedMessage: (msg) => {
              if (msg.cmd === "LIVE_OPEN_PLATFORM_INTERACTION_END") {
                console.log("Game end");
              }
              this.handler(msg);
            },
            onHeartBeatReply: (data) => {
              console.log("heart beat reply");
              this.gameHeartBeat();
            },
            onError: (data) => {
              console.log("error", data);
            },
            onListConnectError: () => {
              console.log("list connect error")
              this.destroySocket();
            },
          };
          // @ts-ignore
          this.ws = new DanmakuWebSocket(opt);
          this.game_id = game_info.game_id;
        }
      })
      .catch(error => {
        console.error(error);
      });
  }
  stopGame() {
    console.log("Game stopped");
    if (!this.game_id) {
      return;
    }
    // GET /v2/app/end
    fetch(API + "/v2/app/end?game_id=" + this.game_id + "&app_id=" + app_id)
      .then(response => response.json())
      .then(data => {
        if (data.code == 0) {
          this.destroySocket()
        }
      })
      .catch(error => {
        console.error(error);
      });
  }

  gameHeartBeat() {
    console.log("Game heart beat");
    // GET /v2/app/heartbeat
    fetch(API + "/v2/app/heartbeat?app_id=" + app_id + "&game_id=" + this.game_id)
      .then(response => response.json())
      .then(data => {
        if (data.code != 0) {
          console.log("Game heart beat failed:", data.msg);
        }
      })
      .catch(error => {
        console.error(error);
      });
  }

  getWebSocketConfig(authBody, wssLinks) {
    const url = wssLinks[0]
    const urlList = wssLinks
    const auth_body = JSON.parse(authBody)
    return {
      url,
      urlList,
      customAuthParam: [
        {
          key: "key",
          value: auth_body.key,
          type: "string",
        },
        {
          key: "group",
          value: auth_body.group,
          type: "string",
        },
      ],
      rid: auth_body.roomid,
      protover: auth_body.protoover,
      uid: auth_body.uid,
    }
  }
  destroySocket() {
    this.ws && this.ws.destroy()
    this.ws = null
  }
}

export default Game;
