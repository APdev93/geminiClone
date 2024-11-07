const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, "../public/uploads/"));
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
	}
});

const upload = multer({ storage: storage });

// Fungsi untuk menghapus file setelah waktu tertentu
function scheduleFileDeletion(filePath, delay) {
	setTimeout(() => {
		fs.unlink(filePath, (err) => {
			if (err) {
				console.error(`Error deleting file: ${filePath}`, err);
			} else {
				console.log(`File deleted: ${filePath}`);
			}
		});
	}, delay);
}

router.post("/", upload.single("image"), (req, res) => {
	// 'image' harus sama dengan yang dikirim di FormData
	if (!req.file) {
		return res.status(400).json({ error: "No file uploaded." });
	}

	// URL file yang diunggah
	const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

	const filePath = path.join(__dirname, "public", "uploads", req.file.filename);

	// Kirim respons berisi detail file
	res.json({
		message: "File uploaded successfully",
		url: fileUrl,
		image: req.file.filename,
		fileDetails: {
			originalName: req.file.originalname,
			mimeType: req.file.mimetype,
			size: req.file.size, // ukuran file dalam byte
			path: req.file.path // path lengkap file di server
		}
	});

	scheduleFileDeletion(filePath, 300000);
});

module.exports = router;
