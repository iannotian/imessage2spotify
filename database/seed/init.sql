COPY songs(id, spotify_track_id, spotify_url, title, artist, album, image_url, occurrences, created_at, updated_at)
FROM '/seed/songs-example.csv'
DELIMITER ','
CSV HEADER;