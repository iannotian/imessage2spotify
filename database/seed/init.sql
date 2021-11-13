COPY songs(id, spotify_url, title, artist, album, image_url, created_at)
FROM '/seed/songs-example.csv'
DELIMITER ','
CSV HEADER;