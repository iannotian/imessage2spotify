import {
  Entity,
  PrimaryKey,
  Property,
  EntityRepository,
} from "@mikro-orm/core";
import { SpotifyTrack } from "../types";

@Entity({ tableName: "songs" })
export class Song {
  static initFromSpotifyTrack(
    repository: EntityRepository<Song>,
    spotifyTrack: SpotifyTrack
  ): Song {
    const { id, uri, album, artists, name, preview_url } = spotifyTrack;

    return repository.create({
      spotifyTrackId: id,
      spotifyUrl: uri,
      spotifyPreviewUrl: preview_url,
      album: album?.name,
      artist: artists?.map((artist) => artist?.name).join(", "),
      imageUrl: album?.images?.[0].url,
      occurrences: 1,
      title: name,
    });
  }

  get toSpotifyTrack(): SpotifyTrack {
    const {
      album,
      artist,
      imageUrl,
      spotifyTrackId,
      spotifyUrl,
      title,
      spotifyPreviewUrl,
    } = this;

    return {
      album: {
        images: [{ url: imageUrl }],
        name: album,
      },
      artists: [{ name: artist }],
      id: spotifyTrackId,
      uri: spotifyUrl,
      preview_url: spotifyPreviewUrl,
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
  spotifyPreviewUrl!: string | null;

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
