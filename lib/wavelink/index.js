let debugMode = true;

function debug(...args) {
  if (debugMode) console.log(...args);
}

class AppWaveLink {
  updatePI() {}
}

import Worker from "tiny-worker";
import Blob from "cross-blob";
import URL from "url";

import simple_jsonrpc from "simple-jsonrpc-js";

import ws from "websocket";
const WebSocket = ws.w3cwebsocket;

export { WaveLinkClient };
