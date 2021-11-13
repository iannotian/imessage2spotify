import { MikroORMOptions } from "@mikro-orm/core";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import { Song } from "./entities/songs.entity";

export default {
  metadataProvider: TsMorphMetadataProvider,
  entities: [Song],
  user: "user",
  password: "password",
  dbName: "imessage2spotify",
  type: "postgresql",
  migrations: {
    path: process.cwd() + "/src/migrations",
  },
  ...(process.env.NODE_ENV === "production" && {
    driverOptions: {
      connection: { ssl: { rejectUnauthorized: false } },
    },
  }),
} as Partial<MikroORMOptions>;
