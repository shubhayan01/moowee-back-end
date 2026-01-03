import Movie from "../models/Movie.js";

export const uploadMovie = async (req, res) => {
    try {
        const title = req.body.title || req.body.tittle || "Untitled";
        const filePath = req.file?.path;

        console.log("Upload - File:", req.file?.filename, "Path:", filePath);

        if (!filePath) return res.status(400).json({ message: "No file received" });

        const movie = await Movie.create({
            title,
            filePath,
            owner: req.userId,
        });

        console.log("Movie created - ID:", movie._id, "FilePath:", movie.filePath);
        res.json({ message: "Movie uploaded successfully", movie });
    } catch (err) {
        console.error("uploadMovie error:", err);
        res.status(500).json({ message: "Server error" });
    }
};