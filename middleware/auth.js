import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "MOOWEE_SECRET";

export default (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.isAdmin = !!decoded.isAdmin;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};