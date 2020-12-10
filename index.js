const express = require('express');
const axios = require('axios');
const qs = require('qs');

require('dotenv').config();

const app = express();
const server = require('http').Server(app);

const redirect = 'https://imessage2spotify.herokuapp.com/callback';
const client_id_secret_64 = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');

app.get('/add', async (req, res) => {

});

app.get('/authorize', async (req, res) => {
    const spotifyURL = new URL('https://accounts.spotify.com/authorize');
    spotifyURL.searchParams.append('client_id', process.env.CLIENT_ID);
    spotifyURL.searchParams.append('response_type', 'code');
    spotifyURL.searchParams.append('redirect_uri', redirect);
    spotifyURL.searchParams.append('scope', 'playlist-modify-private')

    res.redirect(spotifyURL.toString());
});

app.get('/callback', async (req, res) => {
    const { code, error } = req.query;

    const reqConfig = {
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: qs.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect
        }),
        headers: {
            "Authorization": `Basic ${client_id_secret_64}`,
            "content-type": 'application/x-www-form-urlencoded'
        },
        timeout: "5000"
    };

    if (error !== undefined) {
        res.status(403).end();
    }
    else if (code !== undefined) {
        try {
            const response = await axios(reqConfig);
            res.status(200).json(response.data);
        }
        catch (error) {
            res.status(400).end();
        }
    }
});

app.get('/refresh', async (req, res) => {
    const { token } = req.query;

    const reqConfig = {
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: qs.stringify({
            grant_type: 'refresh_token',
            refresh_token: token
        }),
        headers: {
            "Authorization": `Basic ${client_id_secret_64}`,
            "content-type": 'application/x-www-form-urlencoded'
        },
        timeout: "5000"
    };

    if (token !== undefined) {
        try {
            const response = await axios(reqConfig);
            res.status(200).json(response.data);
        }
        catch (error) {
            res.status(400).end();
        }
    }
});

app.get('*', async (req, res) => {
    res.status(404).end();
});

port = process.env.PORT || 8080;

server.listen(port, async () => {
    console.log(`server listening on port ${port}`);
});