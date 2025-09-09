const express = require("express")
const middleware = require("../middlewares/auth.middleware")
const chatRoutes = require("../controllers/chat.controller")
const router = express.Router()

router.post("/", middleware.authUser ,chatRoutes.createChat)
router.get('/', middleware.authUser, chatRoutes.getChats)
router.get('/messages/:id', middleware.authUser, chatRoutes.getMessages)

// Delete chat (and its messages)
router.delete('/:id', middleware.authUser, chatRoutes.deleteChat)
// Delete a single message
router.delete('/message/:id', middleware.authUser, chatRoutes.deleteMessage)

module.exports = router