import { MikroORMOptions } from "@mikro-orm/core";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import { Song } from "./entities/songs.entity";

export default {
  metadataProvider: TsMorphMetadataProvider,
  entities: [Song],
  ...(process.env.NODE_ENV === "production" && {
    clientUrl: process.env.DATABASE_URL,
  }),
  ...(process.env.NODE_ENV !== "production" && {
    user: "user",
    password: "password",
    dbName: "imessage2spotify",
    host: "db",
  }),
  type: "postgresql",
  migrations: {
    path: process.cwd() + "/src/migrations",
    disableForeignKeys: false,
  },
  ...(process.env.NODE_ENV === "production" && {
    driverOptions: {
      connection: { ssl: { rejectUnauthorized: false } },
    },
  }),
} as Partial<MikroORMOptions>;
