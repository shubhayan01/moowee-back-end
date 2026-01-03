import User from "../models/User.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "MOOWEE_SECRET";

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        const hashed = await bcrypt.hash(password, 10);

        const isAdmin = req.body.adminSecret && req.body.adminSecret === process.env.ADMIN_SECRET;

        const user = await User.create({
            name,
            email,
            password: hashed,
            isAdmin: !!isAdmin,
        });

        res.json({ message: "User registered successfully", user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error("Register error:", err);
        if (err.code === 11000) {
            return res.status(409).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Error registering user", error: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, isAdmin: !!user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: !!user.isAdmin } });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Error logging in", error: err.message });
    }
};

export const me = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
}