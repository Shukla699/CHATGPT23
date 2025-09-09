require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const initSocketServer = require("./src/socket/socket");
const http = require("http");

const httpServer = http.createServer(app);
initSocketServer(httpServer);
connectDB();

// Use PORT from environment or fall back to 3001 to avoid conflicts if 3000 is busy
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process first.`);
    process.exit(1); // process ko band kar do
  } else {
    console.error("❌ Server error:", err);
  }
});
