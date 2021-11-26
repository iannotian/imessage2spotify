# iMessage2Spotify Server

This is the source code for iMessage2Spotify's server component. iMessage2Spotify is an iOS Shortcut that depends on this server to save Spotify tracks to a user's account.

## Development

You'll need Docker Compose 3.x and a Spotify account to continue.

To get started, clone this repository, copy `.env.example` to a new file called `.env`, get your own Client ID and Client Secret for Spotify's API, and replace `CLIENT_ID` and `CLIENT_SECRET` with the values from Spotify. Set your callback URL in Spotify to be `localhost:8080/`.

Finally, run `make start` while in the root directory. This will start containers for the app, DB and cache. It will build the code and start the server, which can be accessed via browser at `localhost:8080/`.
