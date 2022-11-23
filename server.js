//#region INITIAL
const express = require("express");
const app = express();
var bodyParser = require("body-parser");
var path = require("path");
var fs = require("fs");
var cors = require("cors");
var upload = require("express-fileupload");
var jsmediatags = require("jsmediatags");
var yt = require('youtube-search-without-api-key');

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
app.use(upload());
//app.use(express.static(path.join(__dirname, 'build')))

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

  //res.sendFile(__dirname + "/test.json");
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

  // fs.writeFile("test.json", JSON.stringify(req.body), "utf8", (err) => {
  //   if (err) {
  //     console.log("An error occured while writing JSON Object to File: " + err);
  //     return console.log("ERROR: Failed to save: " + err);
  //   }
  // });
  // console.log("File Saved to directory");
  // return res.end("File saved.");
});

app.post("/search", bodyParser.text({ type: "*/*" }), (req, res) => {
	yt.search(req.body).then(results => res.send(results))
})

app.post("/upload", (req, res) => {
  var file = req.files.file;
  var filename = file.name;
  var path = __dirname + "/music/" + filename;

  file.mv(path, (err) => {
    if (err) res.send(err);
    else res.send(path);
  });
});


app.delete("/del_path", bodyParser.text({ type: "*/*" }), (req, res) => {
	fs.unlink(req.body, (err) => {
    if (err) res.send(err);
  })
});

app.get("/song/:path", (req, res) => {
  var song_path = req.params.path.replace(/☹☸☼☺☿☾☻/g, "\\");
  //	p('get ' + song_path)
  res.sendFile(song_path, (err) => {
    if (err) {
      console.log("ERROR: " + err);
      return res.end("ERROR: " + err);
    }
  });
});

app.post("/art/:path", (req, res) => {
  let song_path = req.params.path.replace(/☹☸☼☺☿☾☻/g, "\\");
  //consider: ☹☸☼☺☿☾☻

  jsmediatags.read(song_path, {
    onSuccess: (tag) => {
      if (tag.tags.picture == null) return;
      let pdata = tag.tags.picture.data;
      let format = tag.tags.picture.format;
      let base64String = "";

      for (let i = 0; i < pdata.length; i++)
        base64String += String.fromCharCode(pdata[i]);

      //var uurl = base64String
      return res.end(base64String);
    },
    onError: (err) => p(err),
  });
});

const PORT = process.env.PORT || 8080
app.listen(PORT, null, () => console.log("Running on " + PORT));

//#endregion
