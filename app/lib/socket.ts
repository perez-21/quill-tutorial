declare global {
  var ws: WebSocket;
}

const uri = process.env.SOCKET_URL || "ws://localhost:3300/collaborate";

let ws: WebSocket;

if (process.env.NODE_ENV === 'production') {
  ws = new WebSocket(uri);
        
}
else {
  if (!globalThis.ws) {
    globalThis.ws = new WebSocket(uri);
  }
  ws = globalThis.ws;
}

ws.addEventListener('error', () => console.error('error'));
ws.addEventListener('open', () => console.log('Web socket connected'));

export default ws;