import express from "express";
import got, { OptionsOfJSONResponseBody } from "got";
import Rollbar from "rollbar";

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

const app = express();
const server = require("http").Server(app);

const redirect_uri = "https://imessage2spotify.herokuapp.com/callback";
const client_id_secret_64 = Buffer.from(
  `${process.env[requiredEnvVarKeys.CLIENT_ID]}:${
    process.env[requiredEnvVarKeys.CLIENT_SECRET]
  }`
).toString("base64");

app.use(rollbar.errorHandler());

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
