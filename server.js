//#region INITIAL
const express = require("express");
const app = express();
var cors = require("cors");
var yt = require('youtube-search-without-api-key');
const usetube = require('usetube')

const mongoose = require("mongoose");
var dataModel = mongoose.model('Data', new mongoose.Schema({data: {}}))
const URI = "mongodb+srv://Auraxium:fyeFDEQCZYydeMnR@cluster0.hcxjp2q.mongodb.net/?retryWrites=true&w=majority"

p = (s) => console.log(s);

mongoose.connect(URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,

})
.then(() => console.log("connected to database"))
.catch((err) => console.log(err));

function delay(secs) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(""), secs);
  });
}

app.use(cors({ 
	origin: "*", 
	credentials: true,
	methods: "*",
	headers: "*"
}));
app.use(express.json());

app.get("/", (req, res) => {
	res.sendFile(__dirname+"/./index.html")
});

app.get("/test", (req, res) => {
	res.send({"howdy": 'hey'})
})

app.get("/native", (req, res) => {
	res.sendFile(__dirname+"/songs.json", (err) => console.log(err))
})

app.get("/load", (req, res) => {

	dataModel.findOne()
		.then(data => res.json(data.data))
		.catch(err => res.json("Error: " + err))
});

app.post("/save", (req, res) => {

	dataModel.findOne().then(response => {

		if(response == null) {
			let init = new dataModel(req.body);
			init.save();

		} else {
			response.data = req.body;
			response.save()
				.then(() => res.json('songs updated!'))
				.catch(err => res.status(400).json('Error: ' + err));
		}
	})

});

app.post("/YTsearch", (req, res) => {
	yt.search(req.body.search).then(results => res.send(results)).catch(err => res.send(err))
	//usetube.searchVideo(req.body.search).then(results => res.send(results)).catch(err => res.send(err))
})

const PORT = process.env.PORT || 8080
app.listen(PORT, null, () => console.log("Running on " + PORT));

//#endregion
