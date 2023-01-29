//#region INITIAL
const express = require("express");
const app = express();
var cors = require("cors");
// var yt = require("youtube-search-without-api-key");
var yt = require('youtube-search');
const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
var dataModel = mongoose.model("Data", new mongoose.Schema({ data: {} }));
const URI =
  "mongodb+srv://Auraxium:fyeFDEQCZYydeMnR@cluster0.hcxjp2q.mongodb.net/?retryWrites=true&w=majority";

const YT_API_KEY = 'AIzaSyCa-ozYT_nemTy1dYHDBKBUX1qdwUlZSx0'

p = (s) => console.log(s);

mongoose
  .connect(URI, {
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

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: "*",
    headers: "*",
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/./index.html");
});

app.get("/test", (req, res) => {
  res.send({ howdy: "hey" });
});

app.get("/native", (req, res) => {
  res.sendFile(__dirname + "/songs.json", (err) => console.log(err));
});

app.get("/load", (req, res) => {
  dataModel
    .findOne()
    .then((data) => res.json(data.data))
    .catch((err) => res.json("Error: " + err));
});

app.post("/save", (req, res) => {
  dataModel.findOne().then((response) => {
    if (response == null) {
      let init = new dataModel(req.body);
      init.save();
    } else {
      response.data = req.body;
      response
        .save()
        .then(() => res.json("songs updated!"))
        .catch((err) => res.status(400).json("Error: " + err));
    }
  });
});

app.get('/yttest', (req, res) => {
	yt.search('hello')
    .then((results) => console.log(results))

})

//yt.search('hello').then(res => console.log(res))


app.post("/YTsearch", (req, res) => {
	console.log(req.body.search)
  // yt.search(req.body.search)
  //   .then((results) => {console.log(results); res.send(results)})
  //   .catch((err) => res.send(err));

	yt(req.body.search, {maxResults: 10, key: YT_API_KEY}, (err, results) => {
		if(err) {
			console.log(err)
			return res.send(err)
		}
	
		//console.log(results)
		return res.json(results)
	})
});

app.post("/SpotifyPlaylist", async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(req.body.search, {timeout: 90000});

  await new Promise((res, rej) => setTimeout(() => res(""), 4000));

  const num = await page.$$eval(`span[data-encore-id="type"]`, (e) =>
    e.map((el) => el.innerText)
  );
  let length = num[13].match(/^\d+/)[0];
  let songs = [];

  for (let i = 2; i < +length + 2; i++) {
    let song = await page.$$eval(`[aria-rowindex="${i}"]`, (e) =>
      e.map((el) => ({
        name: el.querySelector('div [aria-colindex="2"] div a div').innerText,
        artist: el.querySelector('div [aria-colindex="2"] div span a')
          .innerText,
        length: el.querySelector('div [aria-colindex="5"] div').innerText,
      }))
    );

    let scroll = await page.$(`[aria-rowindex="${i}"]`);
    if (!scroll) break;
    await scroll.evaluate((element) => element.scrollIntoView());
    await new Promise((res, rej) => setTimeout(() => res(""), 100));

    songs.push(song[0]);
  }

  console.log(songs);

  await browser.close();

  res.send(songs);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, null, () => console.log("Running on " + PORT));

//#endregion
