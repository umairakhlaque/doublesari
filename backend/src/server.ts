import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import { registerSocketHandlers, setIO } from './socket';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api', profileRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

setIO(io);
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Double Sar server running on port ${PORT}`);
});
