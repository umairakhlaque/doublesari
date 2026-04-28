import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import { registerSocketHandlers, setIO } from './socket';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Accept multiple allowed origins (comma-separated) or a wildcard pattern.
// In production set CLIENT_URL to your frontend domain.
// In Codespaces both ports are *.app.github.dev — allow all subdomains.
const rawOrigins = process.env.CLIENT_URL ?? 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim());

function isCorsAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / non-browser
  if (allowedOrigins.includes('*')) return true;
  return allowedOrigins.some(allowed => {
    if (allowed.startsWith('*.')) {
      return origin.endsWith(allowed.slice(1));
    }
    return origin === allowed;
  });
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (isCorsAllowed(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api', profileRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: { origin: (origin, cb) => {
    if (isCorsAllowed(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  }, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

setIO(io);
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Double Sar server running on port ${PORT}`);
});
