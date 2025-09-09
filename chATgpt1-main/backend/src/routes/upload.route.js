const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    const name = unique + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, name);
  }
});

const upload = multer({ storage });

router.post('/', upload.array('files', 10), (req, res) => {
  const files = (req.files || []).map(f => ({
    name: f.originalname,
    url: `/uploads/${encodeURIComponent(path.basename(f.path))}`,
    size: f.size,
    type: f.mimetype
  }));

  res.json({ files });
});

module.exports = router;
