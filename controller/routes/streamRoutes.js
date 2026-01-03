import express from "express";
import fs from "fs";
import mongoose from "mongoose";
import Movie from "../../models/Movie.js";
import pathLib from "path";

const router = express.Router();

router.get("/:id", async (req, res) => {
    try {
        // Permissive CORS headers for video streaming
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.header("Cross-Origin-Resource-Policy", "cross-origin");

        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid movie id" });
        }

        const movie = await Movie.findById(id);
        if (!movie) return res.status(404).json({ message: "Movie not found" });

        if (!movie.filePath) return res.status(404).json({ message: "Movie file path missing" });

        const path = pathLib.resolve(movie.filePath);
        console.log("Stream request - Movie ID:", id, "Path:", path, "Exists:", fs.existsSync(path));
        if (!fs.existsSync(path)) {
            console.error("File not found at:", path);
            return res.status(404).json({ message: "Movie file not found on disk" });
        }
        const stat = fs.statSync(path);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunkSize = end - start + 1;
            const file = fs.createReadStream(path, { start, end });

            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": "video/mp4",
                "Cross-Origin-Resource-Policy": "cross-origin"
            });

            file.pipe(res);
        } else {
            res.writeHead(200, {
                "Content-Length": fileSize,
                "Content-Type": "video/mp4",
                "Cross-Origin-Resource-Policy": "cross-origin"
            });

            fs.createReadStream(path).pipe(res);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
