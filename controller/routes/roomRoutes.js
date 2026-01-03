import express from "express";
import crypto from 'crypto';
import Room from "../../models/Room.js";
import auth from "../../middleware/auth.js";

const router = express.Router();

// Create a new watch party room (protected)
router.post("/create", auth, async (req, res) => {
  try {
    // Generate user-friendly room code: ROOM-XXXX
    const code = 'ROOM-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const token = crypto.randomBytes(12).toString('hex');
    const room = await Room.create({
      host: req.userId,
      movie: req.body.movieId,
      inviteToken: token,
      roomCode: code,
    });
    res.json({ room, inviteToken: token, roomCode: code });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get room by ID (protected - only authenticated users)
router.get("/:id", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("movie");
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Join room by invite token (public - uses token as auth)
router.get("/token/:token", async (req, res) => {
  try {
    console.log('Lookup by token:', req.params.token);
    const room = await Room.findOne({ inviteToken: req.params.token }).populate('movie');
    if (!room) {
      console.log('Token lookup failed for', req.params.token);
      return res.status(404).json({ message: 'Room not found or invalid token' });
    }
    console.log('Token lookup success:', room._id.toString());
    res.json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Join room by room code (e.g., ROOM-XXXX) - resolve to the room
router.get("/code/:code", async (req, res) => {
  try {
    console.log('Lookup by code:', req.params.code);
    const room = await Room.findOne({ roomCode: req.params.code }).populate('movie');
    if (!room) {
      console.log('Code lookup failed for', req.params.code);
      return res.status(404).json({ message: 'Room not found or invalid code' });
    }
    console.log('Code lookup success:', room._id.toString());
    res.json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
