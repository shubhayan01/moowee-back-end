import User from "../models/User.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "MOOWEE_SECRET";

export const register = async (req, res) => {
    const { name, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const isAdmin = req.body.adminSecret && req.body.adminSecret === process.env.ADMIN_SECRET;

    const user = await User.create({
        name,
        email,
        password: hashed,
        isAdmin: !!isAdmin,
    });

    res.json({ message: "User registered successfully" });
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, isAdmin: !!user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: !!user.isAdmin } });
}

export const me = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
}