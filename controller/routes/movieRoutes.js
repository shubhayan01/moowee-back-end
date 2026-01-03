import express from 'express'
import auth from '../../middleware/auth.js'
import upload from '../../middleware/upload.js'
import { uploadMovie } from '../movieController.js'
import Movie from '../../models/Movie.js'


const router = express.Router();

// Auth first, then upload, then controller
router.post("/upload", auth, upload.single("movie"), uploadMovie);

// Get all movies (admin sees all; users see their own)
router.get("/", auth, async (req, res) => {
  try {
    const query = req.isAdmin ? {} : { owner: req.userId };
    const movies = await Movie.find(query).select('_id title owner createdAt');
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single movie metadata (protected)
router.get("/:id", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).select('_id title filePath owner createdAt');
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;