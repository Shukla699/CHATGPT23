const express = require("express")
const cookie = require("cookie-parser")
const cors = require('cors');
const authRoute = require("./routes/auth.route")
const chatRoute = require("./routes/chat.route")
const uploadRoute = require("./routes/upload.route")
const path = require("path")
const app = express()


// Allow multiple local dev origins. Respect CLIENT_URL env var if provided.
const DEFAULT_CLIENT = 'http://localhost:5173';
const EXTRA_CLIENT = 'http://localhost:5174';
const CLIENT_URL = process.env.CLIENT_URL || DEFAULT_CLIENT;

const allowedOrigins = [CLIENT_URL, EXTRA_CLIENT].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // otherwise, block
        return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true
}));

app.use(express.json())
app.use(cookie())
app.use(express.static(path.join(__dirname, "../public")))

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

app.use("/api/auth", authRoute)
app.use("/api/chat", chatRoute)
app.use('/api/upload', uploadRoute)



app.get("*name", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"))
})

module.exports = app