import { LockMode, MikroORM, RequestContext, wrap } from "@mikro-orm/core";
import express from "express";
import got, { OptionsOfJSONResponseBody } from "got";
import Rollbar from "rollbar";
import { Song } from "./entities/songs.entity";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") dotenv.config();

process.on("uncaughtException", (error) => {
  console.error(error);

  try {
    rollbar.critical(error);
  } finally {
    process.exit(1);
  }
});

enum requiredEnvVarKeys {
  CLIENT_SECRET = "CLIENT_SECRET",
  CLIENT_ID = "CLIENT_ID",
  PORT = "PORT",
  ROLLBAR_ACCESS_TOKEN = "ROLLBAR_ACCESS_TOKEN",
}

const allRequiredEnvVarsExist = Object.keys(requiredEnvVarKeys).every(
  (requiredKey) => requiredKey in process.env
);

if (!allRequiredEnvVarsExist) {
  throw new Error("process.env is missing required environment variables.");
}

var rollbar = new Rollbar({
  accessToken: process.env[requiredEnvVarKeys.ROLLBAR_ACCESS_TOKEN],
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: process.env.NODE_ENV,
    client: {
      javascript: {
        source_map_enabled: true,
        code_version:
          process.env.GIT_REVISION || process.env.HEROKU_SLUG_COMMIT,
      },
    },
  },
});

if (!process.env.GIT_REVISION && !process.env.HEROKU_SLUG_COMMIT) {
  rollbar.warn(
    "Git SHA not passed in as Node environment variable. Source maps will not work in Rollbar."
  );
}

let orm: MikroORM;

(async function bootstrapORM() {
  orm = await MikroORM.init();
})();

const app = express();
const server = require("http").Server(app);

const redirect_uri = "https://imessage2spotify.herokuapp.com/callback";
const client_id_secret_64 = Buffer.from(
  `${process.env[requiredEnvVarKeys.CLIENT_ID]}:${
    process.env[requiredEnvVarKeys.CLIENT_SECRET]
  }`
).toString("base64");

// middlewares
app.use(rollbar.errorHandler());
app.use((_req, _res, next) => {
  RequestContext.create(orm.em, next);
});
app.use(express.json());

app.get("/", async (_req, res) => {
  res.status(200).send({
    message:
      "Welcome to imessage2spotify. Valid routes include /authorize, /refresh",
  });
});

app.get("/authorize", async (_req, res) => {
  const spotifyURL = new URL("https://accounts.spotify.com/authorize");

  const params = {
    client_id: process.env[requiredEnvVarKeys.CLIENT_ID] ?? "",
    response_type: "code",
    redirect_uri: redirect_uri,
    scope: "playlist-modify-private playlist-modify-public",
  };

  Object.entries(params).forEach(([key, value]) => {
    spotifyURL.searchParams.append(key, value);
  });

  res.redirect(spotifyURL.href);
});

app.get("/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    rollbar.error(error, req);
    res.status(403).end();
  }

  const reqConfig: OptionsOfJSONResponseBody = {
    method: "POST",
    url: "https://accounts.spotify.com/api/token",
    form: {
      grant_type: "authorization_code",
      redirect_uri: redirect_uri,
      code,
    },
    headers: {
      Authorization: `Basic ${client_id_secret_64}`,
    },
  };

  try {
    const response = await got(reqConfig);
    res.status(200).json(response.body);
  } catch (error: any) {
    rollbar.error(error, reqConfig);
    res.status(400).end();
  }
});

app.get("/refresh", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    res.status(400).send({ message: "No token received as query param" }).end();
  }

  const reqConfig: OptionsOfJSONResponseBody = {
    method: "POST",
    url: "https://accounts.spotify.com/api/token",
    form: {
      grant_type: "refresh_token",
      refresh_token: token,
    },
    headers: {
      Authorization: `Basic ${client_id_secret_64}`,
    },
  };

  try {
    const response = await got(reqConfig);
    res.status(200).json(response.body);
  } catch (error: any) {
    rollbar.error(error, reqConfig);
    res.status(400).end();
  }
});

app.post("/save-to-playlist/:playlist_id", async (req, res) => {
  const { token_type, access_token, uris } = req.body;
  const { playlist_id } = req.params;

  if (!token_type || !access_token || !Array.isArray(uris) || !playlist_id) {
    res
      .status(400)
      .send({
        message: `Missing token_type (${token_type}), access_token (${access_token}), uris (${uris}), or playlist_id (${playlist_id})`,
      })
      .end();
    return;
  }

  const reqConfig: OptionsOfJSONResponseBody = {
    method: "POST",
    url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
    json: {
      uris,
    },
    headers: {
      Authorization: `${token_type} ${access_token}`,
    },
  };

  try {
    // save track to user's spotify playlist
    const response = await got(reqConfig);

    try {
      // save track to imessage2spotify database
      const uri = uris[0] as string;
      const trackId = uri.split(":").pop();

      const songRepository = orm.em.getRepository(Song);

      let song = await songRepository.findOne({
        spotifyTrackId: trackId,
      });

      if (song) {
        // update song occurrence count if existing
        wrap(song).assign({ occurrences: song.occurrences + 1 });
      } else {
        // otherwise get the info from spotify and create one in the database
        interface SpotifyTrack {
          id: string;
          name: string;
          album: {
            name: string;
            images: { url: string; height: number; width: number }[];
            uri: string;
          };
          artists: {
            name: string;
            uri: string;
          }[];
          uri: string;
          popularity: number;
          duration_ms: number;
        }

        const spotifyTrackResponse = await got<SpotifyTrack>({
          method: "GET",
          url: `https://api.spotify.com/v1/tracks/${trackId}`,
          headers: {
            Authorization: `${token_type} ${access_token}`,
          },
          responseType: "json",
        });

        song = songRepository.create({
          spotifyTrackId: spotifyTrackResponse?.body?.id,
          spotifyUrl: spotifyTrackResponse?.body?.uri,
          album: spotifyTrackResponse?.body?.album?.name,
          artist: spotifyTrackResponse?.body?.artists
            ?.map((artist) => artist?.name)
            .join(", "),
          imageUrl: spotifyTrackResponse?.body?.album?.images[0].url,
          occurrences: 1,
          title: spotifyTrackResponse?.body?.name,
        });
      }

      await orm.em.persistAndFlush(song);
    } catch (error: any) {
      rollbar.error(error, req, reqConfig);
    }

    res.status(200).json(response.body);
  } catch (error: any) {
    rollbar.error(error, req, reqConfig);
    res.status(400).end();
  }
});

app.get("/latest", async (req, res) => {
  let { limit, offset } = req.query;

  if (typeof limit !== "string" || typeof offset !== "string") {
    limit = "25";
    offset = "0";
  }

  const songRepository = orm.em.getRepository(Song);

  const latestSentSongs = await songRepository.findAll({
    limit: parseInt(limit),
    offset: parseInt(offset),
    orderBy: { updatedAt: "DESC" },
  });

  let staticPayload: string[] = [];

  staticPayload.push("<style>");
  staticPayload.push("body { font-family: sans-serif; }");
  staticPayload.push(".tracks-list { display: flex; }");
  staticPayload.push("</style>");
  staticPayload.push("<head>");
  staticPayload.push("</head>");
  staticPayload.push("<body>");
  staticPayload.push("<h1>Latest shared tracks</h1>");
  staticPayload.push('<div class="tracks-list">');
  for (const song of latestSentSongs) {
    staticPayload.push(
      `<div class="track-wrapper">
        <div class="track-image">
          <img src=${song.imageUrl} />
        </div>
        <div class="track-details">
          <p class="track-title">${song.title}</p>
          <p class="track-artist">${song.artist}</p>
          <p class="track-album">${song.album}</p>
        </div>
        <div class="share-details">
          <p>Last shared ${song.updatedAt.toLocaleString()}, total ${
        song.occurrences
      }x</p>
        </div>`
    );
  }
  staticPayload.push("</div>");
  staticPayload.push("</body>");

  res.status(200).send(staticPayload.join(""));
});

app.get("/version", async (_req, res) => {
  res.status(200).send({ version: process.env.HEROKU_SLUG_COMMIT });
});

app.get("*", async (_req, res) => {
  res.status(404).end();
});

const port = process.env[requiredEnvVarKeys.PORT] || 8080;

server.listen(port, async () => {
  console.log(`server listening on port ${port}`);
});
