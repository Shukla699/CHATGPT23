const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }, // Reference to the user model
    title: { type: String, required: true }, // Title of the chat
    lastActivity: { type: Date, default: Date.now }, // Last activity timestamp
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

const chatModel = mongoose.model("chat", chatSchema);

module.exports = chatModel;