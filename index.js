const express = require('express');
const axios = require('axios');
const qs = require('qs');

require('dotenv').config();

const app = express();
const server = require('http').Server(app);

const redirect = 'https://imessage2spotify.herokuapp.com/callback';

app.get('/add', async (req, res) => {

});

app.get('/authorize', async (req, res) => {
    const spotifyURL = new URL('https://accounts.spotify.com/authorize');
    spotifyURL.searchParams.append('client_id', process.env.CLIENT_ID);
    spotifyURL.searchParams.append('response_type', 'code');
    spotifyURL.searchParams.append('redirect_uri', redirect);

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
            "Authorization": `Basic ${Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64')}`,
            "content-type": 'application/x-www-form-urlencoded'
        },
        timeout: "5000"
    };

    console.log(reqConfig);

    if (error !== undefined) {
        res.status(403).end();
    }
    else if (code !== undefined) {
        try {
            const data = await axios(reqConfig);
            console.log(data);
            res.json(data);
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