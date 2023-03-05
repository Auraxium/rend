//#region INITIAL
const express = require("express");
const app = express();
var cors = require("cors");
var { google } = require("googleapis");
var OAuth2 = google.auth.OAuth2;
const axios = require("axios");
const chromium = require("chromium");
const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
var dataModel = mongoose.model("Data", new mongoose.Schema({ data: {} }));
const URI =
  "mongodb+srv://Auraxium:fyeFDEQCZYydeMnR@cluster0.hcxjp2q.mongodb.net/?retryWrites=true&w=majority";

const YT_API_KEY = "AIzaSyCa-ozYT_nemTy1dYHDBKBUX1qdwUlZSx0";
const baseApiUrl = "https://www.googleapis.com/youtube/v3";

var opts = {
  maxResults: 10,
  key: "AIzaSyCa-ozYT_nemTy1dYHDBKBUX1qdwUlZSx0",
};

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

app.get("/yttest", (req, res) => {
  axios(
    `${baseApiUrl}/videos?id=3VHCxuxtuL8&part=contentDetails&key=${YT_API_KEY}`
  ).then((data) => res.json(data.data));
});

// yt.search('hello').then(res => console.log(res))

app.post("/YTsearch", async (req, res) => {
  console.log(req.body.search);
  let vids;
  await axios(
    `${baseApiUrl}/search?key=${YT_API_KEY}
		&type=video
		&part=snippet
		&maxResults=7
		&q=${req.body.search.replace(/\s+/g, "+")}`
  ).then((data) => (vids = data.data.items));

  for (let i = 0; i < vids.length; i++) {
    let duration = await axios(
      `${baseApiUrl}/videos?id=${vids[i]["id"]["videoId"]}&part=contentDetails&key=${YT_API_KEY}`
    );
    vids[i]["duration"] =
      duration["data"]["items"][0]["contentDetails"]["duration"];
  }

	//console.log(vids)

	function parseDuration(s) {
		let str = [''];
		let ind;

		ind = s.indexOf('H')
		if(ind != -1) { //has H
			str.push(s[ind-1])
			str.push(isNaN(+s[ind-2]) ?  ':' : s[ind-2]) 
		}

		ind = s.indexOf('M')
		if(ind != -1) {
			str.push(isNaN(+s[ind-2]) ?  '' : s[ind-2])	
			str.push(s[ind-1]+':')
		} else str.push(str.length-1 ? '00:' : '0:')

		ind = s.indexOf('S')
		if(ind != -1) {
			str.push(isNaN(+s[ind-2]) ?  '0' : s[ind-2])
			str.push(s[ind-1])
		} else str.push('00')

		return str.join("")
	}

  let send = vids.map((e) => {
    return {
      title: e["snippet"]["title"],
      duration: parseDuration(e['duration']),
      id: e["id"]["videoId"],
    };
  });

  console.log(parseDuration('PT3S'));
  res.json(send);
});

app.post("/SpotifyPlaylist", async (req, res) => {
  const browser = await puppeteer.launch({
    executablePath: chromium.path,
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(req.body.search, { timeout: 90000 });

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
