//#region ----------------INIT---------------------
const express = require("express");
const app = express();
var cors = require("cors");
var { google } = require("googleapis");
const axios = require("axios");
const mongoose = require("mongoose");
const dataModel = mongoose.model("Account2", new mongoose.Schema({ _id: {}, username: String, data: {} }));
const SpotifyWebApi = require("spotify-web-api-node");
const fs = require("fs");
const lz = require("lz-string");
require("dotenv").config();

let p = console.log;

const URI = "mongodb+srv://Auraxium:fyeFDEQCZYydeMnR@cluster0.hcxjp2q.mongodb.net/?retryWrites=true&w=majority";

const YT_API_KEY = process.env.YT_API_KEY;
// console.log(YT_API_KEY)
const baseApiUrl = "https://www.googleapis.com/youtube/v3";

const URL = process.env.URL || "http://localhost:8080";
// console.log(process.env.URL);

mongoose
  .connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("connected to database"))
  .catch((err) => console.log(err));

//#endregion

//#region -------------FUNCTIONS------------------

function delay(secs) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(""), secs);
  });
}

function parseDuration(s) {
  let str = [""];
  let ind;

  ind = s.indexOf("H");
  if (ind != -1) {
    //has H
    str.push(s[ind - 1]);
    str.push(isNaN(+s[ind - 2]) ? ":" : s[ind - 2]);
  }

  ind = s.indexOf("M");
  if (ind != -1) {
    str.push(isNaN(+s[ind - 2]) ? "" : s[ind - 2]);
    str.push(s[ind - 1] + ":");
  } else str.push(str.length - 1 ? "00:" : "0:");

  ind = s.indexOf("S");
  if (ind != -1) {
    str.push(isNaN(+s[ind - 2]) ? "0" : s[ind - 2]);
    str.push(s[ind - 1]);
  } else str.push("00");

  return str.join("");
}

//#endregion

//#region ------------SERVER INIT------------------

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
  res.json({ howdy: "heya", env: process.env.URL || "none", url: URL });
});

app.get("/native", (req, res) => {
  res.sendFile(__dirname + "/songs.json", (err) => console.log(err));
});

app.post("/getImg", async (req, res) => {
  let a = await axios(`https://i.ytimg.com/vi/${req.body.id}/default.jpg`).catch((err) => null);
  if (!a) return res.end();

  a = Buffer.from(a.data, "binary").toString("base64");
  let bound = Math.floor(a.length * 0.75);
  res.send(a.length < 17 ? a : a.substring(bound - 16, bound + 16));

  // let j = fs.readFileSync(__dirname + '/imgsMap.json', 'utf8');
  // console.log(Object.entries(j)[9]);
  // let rrr = {}
  // Object.entries(j).forEach(e => {
  // 	let bound = Math.floor(e[0].length*.75)
  // 	rrr[e[0].substring(bound-10, bound+10)] = e[1]
  // })

  // res.json()

  // console.log(req.body);
  // return res.end()

  // let ims = { none: [] };
  // for (let i = 0; i < req.body.ids.length; i++) {
  //   const e = req.body.ids[i];
  //   let a = await axios(`https://i.ytimg.com/vi/${e}/default.jpg`, { responseType: "blob" }).catch(err => {
  // 		console.log(err.data);
  // 		return null;
  // 	});
  //   if (!a) {
  //     ims.none.push(i);
  //     continue;
  //   }

  //   a = Buffer.from(a.data, "binary").toString("base64");
	// 	let bound = Math.floor(a.length * 0.75);
	// 	a = a.length < 17 ? a : a.substring(bound - 16, bound + 16);
  // 	//  lz.compre
  // 	if(ims[a]) {
  // 		ims[a].push(i)
  // 		continue;
  // 	}

  // 	ims[a] = [i];
  // }
  // res.json(ims)
  // fs.writeFileSync(__dirname +"/imgsMap2.json", JSON.stringify(ims), 'utf-8')
  // res.end();
});

app.post("/mognoInit", (req, res) => {});

app.post("/load", (req, res) => {
  dataModel
    .findById(req.body._id)
    .then((data) => {
      if (!data) {
        return res.status(501).json({ no: "data" });
      }
      // console.log(data);
      res.json(data);
    })
    .catch((err) => res.status(200).json(err));
});

app.post("/save", (req, res) => {
  //console.log(req.body)
  dataModel
    .findById(req.body._id)
    .then((mg) => {
      if (!mg) {
        let init = new dataModel(req.body);
        init.save();
        res.status(200).json("songs updated!");
      } else {
        mg.data = req.body.data;
        mg.save()
          .then(() => res.json("songs updated!"))
          .catch((err) => res.status(400).json("Error: " + err));
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ err: err });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, null, () => console.log("Running on " + PORT));

//#endregion

//#region ---------------GOOGLE---------------------

const googCID = "482771111816-0fpbmptbpflo8ackjf70gl1ls3ejl7fi.apps.googleusercontent.com";
const googCS = "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";

let googCache = {};

const GOauth = new google.auth.OAuth2(googCID, googCS, URL + "/googOauth/callback");

app.post("/googOauth", (req, res) => {
  googCache[req.body.uuid] = { origin: req.body.origin };
  const googAuthUrl = GOauth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
    include_granted_scopes: true,
    state: req.body.uuid,
  });
  res.json({ url: googAuthUrl });
});

app.get("/googOauth/callback", async (req, res) => {
  session = req.query.state;
  const response = await GOauth.getToken(req.query.code);
  GOauth.setCredentials({
    access_token: response.tokens.access_token,
    refresh_token: response.tokens.refresh_token,
  });
  googCache[session]["access_token"] = response.tokens.access_token;
  googCache[session]["refresh_token"] = response.tokens.refresh_token;
  let ax = await axios("https://people.googleapis.com/v1/people/me?personFields=names", {
    headers: {
      Authorization: `Bearer ${response.tokens.access_token}`,
    },
  });
  googCache[session]["googleId"] = ax.data.names[0].metadata.source.id;
  googCache[session]["username"] = ax.data.names[0].displayName;
  googCache[session]["now"] = Date.now();
  res.redirect(googCache[session]["origin"]);
});

app.post("/googGetToken", (req, res) => {
  let token = googCache[req.body.uuid];
  console.log(token);
  delete googCache[req.body.uuid];
  return res.json(token);
});

//#endregion

//#region ---------------YOUTUBE--------------------

app.get("/yttest", (req, res) => {
  axios(`${baseApiUrl}/videos?id=b8-tXG8KrWs,hZvitm7eK9c,MrLnOfYFVvQ,lcNfSwl2SmI,jcxate72OMg,oIoyTuvqHAs,cW6uJAaLfRA,xwhBRJStz7w,qn7HvnMJZd4,RDk5NB3pgJo,mg-ODPxYl9Q,CDhUvkzLsmQ,a2Cenb4UNFE,vE8zTxbifNM,yFdLSM8zVVI,uxurZPG1k-M,tRAEkH3EqGQ,MBq722OJ8QY,C6mvSrZA410,cbuV0WtQXjw,j2VtMsBYTjI&part=contentDetails&part=snippet&key=${YT_API_KEY}`).then((data) => res.json(data.data));
});

app.post("/YTsearch", async (req, res) => {
  console.log(req.body.search);
  let vids;
  await axios(
    `${baseApiUrl}/search?key=${YT_API_KEY}
		&type=video
		&part=snippet
		&maxResults=10
		&q=${req.body.search.replace(/\s+/g, "+")}`
  )
    .then((data) => (vids = data.data.items))
    .catch((err) => console.log(err.response.data));

  if (!vids) return;

  let send = vids.map((e) => {
    return {
      name: e["snippet"]["title"],
      id: e["id"]["videoId"],
    };
  });
  res.json(send);
});

app.post("/getYTData", async (req, res) => {
  let searches = req.body.search;
  let str = "";
  let count = 0;
  let request;
  let save = 0;

  for (let i = 0; i < searches.length; i++) {
    if (count + searches[i].length > 49) {
      count = 0;
      request = await axios(`${baseApiUrl}/videos?id=${str}part=contentDetails&part=snippet&key=${YT_API_KEY}`);

      let part = request["data"]["items"];

      for (let j = save; j < i; j++) {
        for (let k = 0; k < searches[j].length; k++) {
          try {
            searches[j][k]["duration"] = part[count]["contentDetails"]["duration"] ? part[count]["contentDetails"]["duration"] : "0:00";
            count++;
          } catch (err) {
            continue;
          }
        }
      }
      save = i;
      count = 0;
      str = "";
    }

    for (let j = 0; j < searches[i].length; j++) {
      str += `${searches[i][j]["id"]},`;
      count++;
    }
  }

  if (count) {
    count = 0;
    let i = searches.length;
    request = await axios(`${baseApiUrl}/videos?id=${str}&part=contentDetails&part=snippet&key=${YT_API_KEY}`);

    let part = request["data"]["items"];
    console.log(part);
    console.log(str);

    for (let j = save; j < i; j++) {
      for (let k = 0; k < searches[j].length; k++) {
        searches[j][k]["duration"] = parseDuration(part[count]["contentDetails"]["duration"]);
        count++;
      }
    }
  }

  console.log(searches);
  res.json({ searches: searches });
});

//#endregion

//#region  --------------SPOTIFY------------------

const spotifyCID = "66e36ea2ef934f62b4cb680d7bacae1a";
const spotifyCS = "f1c16266ebc54950b32d8bad98109e72";

let spotCache = {};

const spotifyApi = new SpotifyWebApi({
  clientId: spotifyCID,
  clientSecret: spotifyCS,
  redirectUri: URL + "/spotifyOauth/callback",
});

app.post("/spotGetToken", (req, res) => {
  let token = spotCache[req.body.uuid];
  delete spotCache[req.body.uuid];
  return res.json(token);
});

app.post("/spotGetAccess", async (req, res) => {
  axios
    .post("https://www.googleapis.com/oauth2/v4/token", {
      client_id: spotifyCID,
      client_secret: spotifyCS,
      refresh_token: req.body.rt,
      grant_type: "refresh_token",
    })
    .then((ax) => res.json({ ac: ac }))
    .catch((err) => res.json(err));
});

app.post("/spotOauth", async (req, res) => {
  console.log("???");
  spotCache[req.body.uuid] = { origin: req.body.origin };
  const authorizeUrl = await spotifyApi.createAuthorizeURL(["playlist-read-collaborative"], req.body.uuid);
  res.json({ url: authorizeUrl });
});

app.get("/spotifyOauth/callback", (req, res) => {
  let state = req.query.state;
  spotifyApi
    .authorizationCodeGrant(req.query.code)
    .then((data) => {
      console.log(data);
      spotCache[state]["access_token"] = data.body["access_token"];
      spotCache[state]["refresh_token"] = data.body["refresh_token"];
      spotCache[state]["expires"] = data.body["expires_in"];
      spotCache[state]["now"] = Date.now();
    })
    .finally(() => res.redirect(spotCache[state]["origin"]));
});

//#endregion

// const browser = await puppeteer.launch({
//   executablePath: chromium.path,
//   headless: true,
// });
// const page = await browser.newPage();
// await page.goto(req.body.search, { timeout: 90000 });
// console.log("SP started");

// await new Promise((res, rej) => setTimeout(() => res(""), 4000));

// const num = await page.$$eval(`meta[property="og:description"]`, (e) =>
//   e.map((el) => el.getAttribute("content"))
// );
// let length = +num[0].replace(/\D+/g, "");
// let songs = [];
// console.log(length);

// for (let i = 2; i < +length + 2; i++) {
//   let song = await page.$$eval(`[aria-rowindex="${i}"]`, (e) =>
//     e.map((el) => ({
//       name: el.querySelector('div [aria-colindex="2"] div a div').innerText,
//       artist: el.querySelector('div [aria-colindex="2"] div span a')
//         .innerText,
//       length: el.querySelector('div [aria-colindex="5"] div').innerText,
//     }))
//   );

//   let scroll = await page.$(`[aria-rowindex="${i}"]`);
//   if (!scroll) break;
//   await scroll.evaluate((element) => element.scrollIntoView());
//   await new Promise((res, rej) => setTimeout(() => res(""), 100));

//   songs.push(song[0]);
//   console.log(i + " songs");
// }

// console.log(songs);
// await browser.close();
// res.send(songs);
