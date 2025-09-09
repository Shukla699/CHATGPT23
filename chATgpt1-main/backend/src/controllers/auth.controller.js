const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")


function parseName(body) {
    const nameObj = body.fullName || body.fullname || {};
    const firstName = nameObj.firstName || nameObj.firstname || '';
    const lastName = nameObj.lastName || nameObj.lastname || '';
    return { firstName, lastName };
}

async function registerUser(req, res) {
    try {
        const { email, password } = req.body || {};
        const { firstName, lastName } = parseName(req.body || {});

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const existing = await userModel.findOne({ email });
        if (existing) return res.status(400).json({ message: "User already exists" });

        const hashpassword = await bcrypt.hash(password, 10);

        // Persist using the schema field `fullName` (matching model)
        const user = await userModel.create({
            fullName: {
                firstName,
                lastName
            },
            email,
            password: hashpassword
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set cookie with safe defaults; frontend must use withCredentials
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (err) {
        console.error('registerUser error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });

        const user = await userModel.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: "User logged in successfully",
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (err) {
        console.error('loginUser error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    registerUser,
    loginUser,
    getMe
}


async function getMe(req, res) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
        const user = req.user;
        return res.status(200).json({ message: 'Authenticated', user: { id: user._id, email: user.email, fullName: user.fullName } });
    } catch (err) {
        console.error('getMe error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
}

// Logout user by clearing the auth cookie
async function logoutUser(req, res) {
    try {
        // Explicitly overwrite the cookie with an expired value for cross-client consistency
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 0
        });

        // Also call clearCookie as a best-effort
        res.clearCookie('token', { path: '/' });

        return res.status(200).json({ message: 'Logged out' });
    } catch (err) {
        console.error('logoutUser error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
}

// Update exports to include logoutUser
module.exports = Object.assign(module.exports, { logoutUser });
