import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import authRoutes from "./controller/routes/authRoutes.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure movies directory exists
const moviesDir = path.join(__dirname, "movies");
if (!fs.existsSync(moviesDir)) {
  fs.mkdirSync(moviesDir, { recursive: true });
  console.log("Created movies directory at", moviesDir);
}

import movieRoutes from "./controller/routes/movieRoutes.js";
import streamRoutes from "./controller/routes/streamRoutes.js";
import { createServer } from "http";
import { Server } from "socket.io";
import roomRoutes from "./controller/routes/roomRoutes.js";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Room from "./models/Room.js";


dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }
});

// Apply security middlewares
app.use(helmet());
app.use(compression());

// rate limit auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // authenticate socket if token provided
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "MOOWEE_SECRET");
      socket.userId = decoded.id;
      socket.isAdmin = !!decoded.isAdmin;
    } catch (e) {
      console.warn("Socket auth failed", e.message);
    }
  }

  const joinHandler = async (roomId) => {
    try {
      const room = await Room.findById(roomId).populate('host');
      socket.join(roomId);
      // notify others
      socket.to(roomId).emit("user-joined", { id: socket.id, userId: socket.userId, name: socket.userId ? (socket.userId === room.host? room.host.name : undefined) : undefined });
      const size = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit("participants", { count: size });
    } catch (e) { console.warn('joinHandler error', e); }
  };

  socket.on("Join-room", joinHandler);
  socket.on("join-room", joinHandler);

  // playback syncing — only allow host or admin to control
  socket.on("play", async ({ roomId, time }) => {
    try {
      const r = await Room.findById(roomId);
      if (!r) return;
      if (String(r.host) !== String(socket.userId) && !socket.isAdmin) return; // ignore if not host/admin
      socket.to(roomId).emit("play", time);
    } catch (e) { console.warn(e); }
  });

  socket.on("pause", async ({ roomId, time }) => {
    try {
      const r = await Room.findById(roomId);
      if (!r) return;
      if (String(r.host) !== String(socket.userId) && !socket.isAdmin) return;
      socket.to(roomId).emit("pause", time);
    } catch (e) { console.warn(e); }
  });

  socket.on("seek", async ({ roomId, time }) => {
    try {
      const r = await Room.findById(roomId);
      if (!r) return;
      if (String(r.host) !== String(socket.userId) && !socket.isAdmin) return;
      socket.to(roomId).emit("seek", time);
    } catch (e) { console.warn(e); }
  });

  socket.on("chat", ({ roomId, message, user }) => {
    // basic sanitization: trim and limit
    const msg = String(message || '').slice(0, 1000).trim();
    if (!msg) return;
    socket.to(roomId).emit("chat", { message: msg, user });
  });

  // WebRTC signaling forwarding
  socket.on("webrtc-offer", ({ roomId, offer }) => { socket.to(roomId).emit("webrtc-offer", { offer }); });
  socket.on("webrtc-answer", ({ roomId, answer }) => { socket.to(roomId).emit("webrtc-answer", { answer }); });
  socket.on("webrtc-ice", ({ roomId, candidate }) => { socket.to(roomId).emit("webrtc-ice", { candidate }); });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((roomId) => {
      if (roomId === socket.id) return;
      const size = io.sockets.adapter.rooms.get(roomId)?.size || 1;
      const after = Math.max(0, size - 1);
      io.to(roomId).emit("participants", { count: after });
      socket.to(roomId).emit("user-left", { id: socket.id, userId: socket.userId });
    });
  });
});

// ---------- EXPRESS MIDDLEWARE ----------
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use(cors({
  origin: [frontendOrigin, "http://localhost:5174"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/stream", streamRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/movies", express.static("movies"));
app.use("/api/rooms", roomRoutes);


// ---------- DB ----------
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

// ---------- SERVER ----------
httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
