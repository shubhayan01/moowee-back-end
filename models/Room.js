import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
    playbackTime: { type: Number, default: 0 },
    isPlaying: { type: Boolean, default: false },
    inviteToken: { type: String, unique: true, sparse: true },
    roomCode: { type: String, unique: true, sparse: true },
}, { timestamps: true });

export default mongoose.model("Room", roomSchema);