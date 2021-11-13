import { Migration } from "@mikro-orm/migrations";

export class Migration20211112231833 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "songs" ("id" serial primary key, "spotify_track_id" varchar(255) not null, "spotify_url" varchar(255) not null, "title" varchar(255) not null, "artist" varchar(255) not null, "album" varchar(255) not null, "image_url" varchar(255) not null, "occurrences" int4 not null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null);'
    );
    this.addSql(
      'create index "songs_spotify_track_id_index" on "songs" ("spotify_track_id");'
    );
    this.addSql(
      'alter table "songs" add constraint "songs_spotify_track_id_unique" unique ("spotify_track_id");'
    );
  }
}
