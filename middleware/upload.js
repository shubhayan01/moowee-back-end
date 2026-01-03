import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moviesDir = path.join(__dirname, "../movies");

const storage = multer.diskStorage({
    destination: moviesDir,
    filename: (req, file, cb) => {
        const safeName = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9.\-_( )]/g, "_");
        cb(null, safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "video/x-matroska"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"), false);
};

export default multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });