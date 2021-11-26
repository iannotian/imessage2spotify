import { MikroORM, RequestContext, wrap } from "@mikro-orm/core";
import express from "express";
import got, { OptionsOfJSONResponseBody } from "got";
import Rollbar from "rollbar";
import { Song } from "./entities/songs.entity";
import dotenv from "dotenv";
import mikroOrmConfig from "./mikro-orm.config";
import path from "path";
import { formatTimeAgo } from "./util";
import { SpotifyTrack } from "./types";
import ejs from "ejs";
import Redis from "ioredis";

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

async function main() {
  const redisLocalConfig: Redis.RedisOptions = {
    host: process.env.REDIS_HOST,
    ...(process.env.REDIS_PORT && { port: parseInt(process.env.REDIS_PORT) }),
    password: process.env.REDIS_PASSWORD,
  };

  let redis: Redis.Redis;

  if (process.env.NODE_ENV === "production") {
    redis = new Redis(process.env.REDIS_URL);
  } else {
    redis = new Redis(redisLocalConfig);
  }

  const orm = await MikroORM.init(mikroOrmConfig);

  const app = express();
  const server = require("http").Server(app);

  const latestPageCache = {
    valid: false,
    value: "",
  };

  const redirect_uri =
    process.env.NODE_ENV === "production"
      ? "https://imessage2spotify.herokuapp.com/callback"
      : "http://localhost:8080/callback";

  const client_id_secret_64 = Buffer.from(
    `${process.env[requiredEnvVarKeys.CLIENT_ID]}:${
      process.env[requiredEnvVarKeys.CLIENT_SECRET]
    }`
  ).toString("base64");

  // middlewares
  app.use(rollbar.errorHandler());
  app.use((_req, _res, next) => {
    RequestContext.create(orm?.em, next);
  });
  app.use(express.json());

  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "ejs");

  app.get("/", async (_req, res) => {
    res.redirect("/latest");
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
      responseType: "json",
    };

    try {
      const { body } = await got(reqConfig);
      // res.status(200).json(response.body);
      res.render("callback", { data: body });
    } catch (error: any) {
      rollbar.error(error, reqConfig);
      res.status(400).end();
    }
  });

  app.get("/refresh", async (req, res) => {
    const { token } = req.query;

    if (!token) {
      res
        .status(400)
        .send({ message: "No token received as query param" })
        .end();
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
      responseType: "json",
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
      rollbar.error({
        message: "Missing parameters in GET /save-to-playlist/:playlist_id",
        token_type,
        access_token,
        uris,
        playlist_id,
      });

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
      responseType: "json",
    };

    try {
      // save track to user's spotify playlist
      const response = await got(reqConfig);

      try {
        // save track to imessage2spotify database
        latestPageCache.valid = false;

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
            imageUrl: spotifyTrackResponse?.body?.album?.images?.[0].url,
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
    if (latestPageCache.valid) {
      res.send(latestPageCache.value);
      return;
    }

    const songRepository = orm.em.getRepository(Song);

    const latestSentSongs = await songRepository.findAll({
      limit: 25,
      orderBy: { updatedAt: "DESC" },
    });

    const viewData = {
      tracks: latestSentSongs.map((song: Song) => ({
        ...song,
        sharedTimeAgo: formatTimeAgo(song.updatedAt),
        sharedTime: song.updatedAt,
        fire:
          song.occurrences < 2
            ? "🆕"
            : song.occurrences < 5
            ? Array(Math.min(song.occurrences, 4)).fill("🔥").join("")
            : song.occurrences > 10
            ? `🥵🥵🥵🥵🥵 x${Math.floor(song.occurrences / 5)}`
            : "🥵🥵🥵🥵🥵",
      })),
    };

    latestPageCache.value = await ejs.renderFile(
      `${process.cwd()}/dist/views/latest.ejs`,
      viewData
    );
    latestPageCache.valid = true;

    res.send(latestPageCache.value);
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
}

main().catch((error) => {
  rollbar.critical(error);
  console.error(error.stack);
});
