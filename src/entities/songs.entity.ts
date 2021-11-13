import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity({ tableName: "songs" })
export class Song {
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
