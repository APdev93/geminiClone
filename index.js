require("./config.js");
const root = process.cwd();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const { fromBuffer } = require("file-type");

const uploadRoutes = require("./routes/upload");

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/upload", uploadRoutes);

const ugu = async (fileBuffer) => {
	try {
		const { mime, ext } = await fromBuffer(fileBuffer);

		const formData = new FormData();
		formData.append("files[]", fileBuffer, {
			filename: `file.${ext}`,
			contentType: mime
		});

		const response = await axios.post("https://uguu.se/upload", formData, {
			headers: {
				...formData.getHeaders()
			}
		});

		return response.data.files[0].url;
	} catch (error) {
		console.error("Upload failed:", error);
		throw error;
	}
};

const YanzGPT = (query, model) => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axios("https://yanzgpt.my.id/chat", {
				data: {
					query: query,
					model: model
				},
				headers: {
					authorization: "Bearer yzgpt-sc4tlKsMRdNMecNy",
					"Content-Type": "application/json"
				},
				method: "POST"
			});
			resolve(response.data);
		} catch (error) {
			reject(error);
		}
	});
};

const formatCitations = (text) => {
	const citationRegex = /\[(\d+)\]\s*(https?:\/\/[^\s]+)/g;

	const citationMap = {};
	let match;

	while ((match = citationRegex.exec(text)) !== null) {
		citationMap[match[1]] = match[2];
	}

	let mainText = text.split("Citations:")[0];
	mainText = mainText.replace(
		/\[(\d+)\]/g,
		(match, number) => `[[${number}]](${citationMap[number]})`
	);

	return mainText.trim();
};

app.get("/", (req, res) => {
	res.render("index");
});

app.post("/chat", async (req, res) => {
	let { query, model } = req.body;
	const userIp = req.userIp;
	console.log(req.body);

	if (!query) return res.status(404).json({ message: "missing prompt!" });

	let url;

	if (typeof query === "object" && query.image) {
		let imageBuffer = fs.readFileSync(`${root}/public/uploads/${query.image}`);
		console.log("buffer image: ", imageBuffer);
		let imageURL = await ugu(imageBuffer);
		console.log("url image: ", imageURL);
		url = imageURL;
		query = query.text;
	}

	try {
		const response = await axios.post("https://api.yanzbotz.live/api/ai/yanzdev", {
			query: query,
			model: model,
			url: url || "",
			id: userIp
		});
		const { answer } = response.data.result;

		if (answer.cmd !== "bingimg") {
			let formatted = formatCitations(answer.msg);
			res.status(200).json({ message: formatted });
		} else {
			res.status(200).json({ message: "Cannot process message" });
	}
	} catch (e) {
		console.error(e);
		res.status(500).json({ message: "Internal Server Error" });
	}
});

app.listen(global.PORT, () => {
	console.log("Server running at port: ", global.PORT);
});
