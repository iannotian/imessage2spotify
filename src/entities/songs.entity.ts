import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { SpotifyTrack } from "../types";

@Entity({ tableName: "songs" })
export class Song {
  get toSpotifyTrack(): SpotifyTrack {
    const { album, artist, imageUrl, spotifyTrackId, spotifyUrl, title } = this;

    return {
      album: {
        images: [{ url: imageUrl }],
        name: album,
      },
      artists: [{ name: artist }],
      id: spotifyTrackId,
      uri: spotifyUrl,
      name: title,
    };
  }

  @PrimaryKey()
  id!: number;

  @Property({ index: true, unique: true })
  spotifyTrackId!: string;

  @Property()
  spotifyUrl!: string;

  @Property()
  title!: string;

  @Property()
  artist!: string;

  @Property()
  album!: string;

  @Property()
  imageUrl!: string;

  @Property()
  occurrences = 0;

  @Property()
  createdAt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt = new Date();
}
