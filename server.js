import express from 'express';
import next from 'next';
import { WebSocketServer } from 'ws';
import http from 'http';

const port = 8000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const groups = {};

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);
  const wss = new WebSocketServer({ server });

  wss.on('connection', ws => {
    ws.group = null;
    ws.username = null;

    ws.on('message', data => {
      try {
        const parsed = JSON.parse(data);
        console.log('Received:', parsed);

        // Handle group join
        if (parsed.type === 'join') {
          ws.group = parsed.group;
          ws.username = parsed.user;

          if (!groups[parsed.group]) {
            groups[parsed.group] = new Set();
          }
          groups[parsed.group].add(ws);
          console.log(`${parsed.user} joined group: ${parsed.group}`);
          return;
        }

        // Handle typing notification
        if (parsed.type === 'typing' && ws.group) {
          const typingInfo = JSON.stringify({ type: 'typing', user: parsed.user });
          for (const client of groups[ws.group]) {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(typingInfo);
            }
          }
          return;
        }

        // Handle chat message
        if (parsed.type === 'message' && ws.group) {
          const msg = JSON.stringify({
            type: 'message',
            user: parsed.user,
            message: parsed.message,
          });

          for (const client of groups[ws.group]) {
            if (client.readyState === ws.OPEN) {
              client.send(msg);
            }
          }
          return;
        }

      } catch (err) {
        console.error('Invalid WebSocket message:', data);
      }
    });

    ws.on('close', () => {
      if (ws.group && groups[ws.group]) {
        groups[ws.group].delete(ws);
        console.log(`${ws.username || 'A user'} left group: ${ws.group}`);
        if (groups[ws.group].size === 0) {
          delete groups[ws.group];
        }
      }
    });
  });

  expressApp.use((req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Server ready at http://localhost:${port}`);
  });
});
