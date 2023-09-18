//#region ----------------INIT---------------------
const express = require("express");
const app = express();
var cors = require("cors");
var { google } = require("googleapis");
const axios = require("axios");
const querystring = require("querystring");
const mongoose = require("mongoose");
const dataModel = mongoose.model("Account", new mongoose.Schema({ _id: {}, username: String, data: {} }));
const SpotifyWebApi = require("spotify-web-api-node");
const fs = require("fs");
const cheerio = require("cheerio");
const lz = require("lz-string");
require("dotenv").config();

let p = console.log;
const version = 0.7

const URI = "mongodb+srv://Auraxium:fyeFDEQCZYydeMnR@cluster0.hcxjp2q.mongodb.net/?retryWrites=true&w=majority";
const YT_API_KEY = process.env.YT_API_KEY;
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

async function delay(secs) {
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
  res.send("hey pal");
});

app.get("/test", (req, res) => {
  res.json({ howdy: "heya", env: process.env.URL || "none", url: URL });
});

app.post("/test", (req, res) => {
  console.log("ur testing me");
  res.json({ howdy: "heya", env: process.env.URL || "none", url: URL });
});

app.get("/native", (req, res) => {
  res.sendFile(__dirname + "/songs.json", (err) => console.log(err));
});

app.post("/getImg", async (req, res) => {
  let a = await axios(`https://i.ytimg.com/vi/${req.body.id}/default.jpg`).catch((err) => null);
  if (!a) return res.send("none");
  a = Buffer.from(a.data, "binary").toString("base64");
  let bound = Math.floor(a.length * 0.75);
  res.send(a.length < 17 ? a : a.substring(bound - 16, bound + 16));
});

app.post("/load", (req, res) => {
  dataModel
    .findById(req.body._id)
    .then((data) => {
      if (!data) return res.status(501).json({ no: "data" });
      res.json(data);
    })
    .catch((err) => res.status(400).json(err));
});

app.post("/lastSave", (req, res) => {
  dataModel
    .findById(req.body._id)
    .select("data.date")
    .then((data) => res.json(data.data.date)) 
    .catch((err) => res.status(500).json(err));
});

app.post("/save", (req, res) => {
	if((req.body.version || 0) < version) return res.end()
  dataModel.findByIdAndUpdate(req.body._id, req.body.parts, { new: true }, (err, doc) => {
    if (err) return res.status(400).send(err);
    if (!doc) return res.status(505).send("Id not found so gimme new");
    res.json({ msg: "updated" });
  });
});

app.post("/saveUnload", (req, res) => {
	if((req.body.version || 0) < version) return res.end()
  dataModel
    .findById(req.body._id)
    .select("data.date")
    .then((data) => {
      if (req.body.last < data.data.date) return res.end();
      dataModel.findByIdAndUpdate(req.body._id, req.body.parts, { new: true, acknowledge: false }, (err) => res.end());
    })
		.catch(err => res.status(500).send(err));;
});

app.post("/hardSave", (req, res) => {
	if((req.body.version || 0) < version) return res.end()
  dataModel
    .findById(req.body._id)
    .then((data) => {
      if (!data) {
        let init = new dataModel(req.body);
        init.save();
        return res.status(200).json("new account so made new");
      }
      data.data = req.body.data;
      data.save();
      res.json("saved hard");
    })
    .catch((err) => res.status(500).send(err));
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
  delete googCache[req.body.uuid];
  return res.json(token);
});

//#endregion

//#region ---------------YOUTUBE--------------------

app.get("/yttest", (req, res) => {
  axios(`${baseApiUrl}/videos?id=b8-tXG8KrWs,hZvitm7eK9c,MrLnOfYFVvQ,lcNfSwl2SmI,jcxate72OMg,oIoyTuvqHAs,cW6uJAaLfRA,xwhBRJStz7w,qn7HvnMJZd4,RDk5NB3pgJo,mg-ODPxYl9Q,CDhUvkzLsmQ,a2Cenb4UNFE,vE8zTxbifNM,yFdLSM8zVVI,uxurZPG1k-M,tRAEkH3EqGQ,MBq722OJ8QY,C6mvSrZA410,cbuV0WtQXjw,j2VtMsBYTjI&part=contentDetails&part=snippet&key=${YT_API_KEY}`)
    .then((data) => res.json(data.data))
    .catch((err) => res.status(500).send(err));
});

app.post("/YTsearchV2", (req, res) => {
  axios
    .get(`https://www.youtube.com/results?search_query=${encodeURIComponent(req.body.search)}`)
    .then((ax) => {
      let html = ax.data.replace(/mainAppWebResponseContext/g, "initplayback?mainAppWebResponseContext");
      const regex = /initplayback\?([^]*?)(?=initplayback\?|$)/g;

      let match;
      let map = [];
      let limit = req.body.count || 10;
      let temp = "";

      while ((match = regex.exec(html)) !== null && map.length < limit) {
        // matches.push(match[1].trim());
        let json = {};
        let e = match[1].trim();
        temp = e.match(/"title":{"runs":\[{"text":"([^"]*)"/);
        if (temp && temp[1]) json.name = temp[1];
        else continue;

        temp = e.match(/"watchEndpoint":{"videoId":"([^"]*)"/);
        if (temp && temp[1]) json.yt_id = temp[1];
        else continue;

        temp = e.match(/"}},"simpleText":"([^"]*)"},"viewCountText":{"simpleText":"/);
        if (temp && temp[1]) json.end_raw = temp[1];
        else continue;

        map.push(json);
      }
      res.json(map);
    })
    .catch((err) => {
      console.log(err);
      res.json(err);
    });
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

    for (let j = save; j < i; j++) {
      for (let k = 0; k < searches[j].length; k++) {
        searches[j][k]["duration"] = parseDuration(part[count]["contentDetails"]["duration"]);
        count++;
      }
    }
  }

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
  const refresh_token = req.body.rt;
  const client_id = spotifyCID;
  const client_secret = spotifyCS;

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: { Authorization: "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64") },
    data: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
  };

  try {
    const response = await axios.post(authOptions.url, authOptions.data, {
      headers: authOptions.headers,
    });

    const access_token = response.data.access_token;
    res.json({ ac: access_token, now: Date.now() });
  } catch (error) {
    console.error("Error refreshing access token:", error);
    res.status(500).json({ error: "Error refreshing access token" });
  }
});

app.post("/spotOauth", async (req, res) => {
  spotCache[req.body.uuid] = { origin: req.body.origin };
  const authorizeUrl = await spotifyApi.createAuthorizeURL(["playlist-read-collaborative", "streaming", "user-read-email", "user-read-private"], req.body.uuid);
  res.json({ url: authorizeUrl });
});

app.get("/spotifyOauth/callback", async (req, res) => {
  let state = req.query.state;
  let data = await spotifyApi.authorizationCodeGrant(req.query.code).catch((err) => console.err("err in data_req: " + err));
  // console.log(data.body);
  let { data: name_req } = await axios
    .get(`https://api.spotify.com/v1/me`, {
      headers: {
        Authorization: `Bearer ${data.body["access_token"]}`,
      },
    })
    .catch((err) => console.error("err in name_req: " + err.data));
  // console.log(name_req);
  spotCache[state]["username"] = name_req["display_name"];
  spotCache[state]["access_token"] = data.body["access_token"];
  spotCache[state]["refresh_token"] = data.body["refresh_token"];
  spotCache[state]["expires"] = data.body["expires_in"];
  spotCache[state]["now"] = Date.now();
  res.redirect(spotCache[state]["origin"]);
});

//#endregion
