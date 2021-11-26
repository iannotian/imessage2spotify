create table "songs" ("id" serial primary key, "spotify_track_id" varchar(255) not null, "spotify_url" varchar(255) not null, "title" varchar(255) not null, "artist" varchar(255) not null, "album" varchar(255) not null, "image_url" varchar(255) not null, "occurrences" int4 not null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null);
COPY songs(id, spotify_track_id, spotify_url, title, artist, album, image_url, occurrences, created_at, updated_at)
FROM '/seed/songs-example.csv'
DELIMITER ','
CSV HEADER;