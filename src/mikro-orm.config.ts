import { MikroORMOptions } from "@mikro-orm/core";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import { Song } from "./entities/songs.entity";

export default {
  metadataProvider: TsMorphMetadataProvider,
  entities: [Song],
  ...(process.env.NODE_ENV === "production" && {
    clientUrl: process.env.DATABASE_URL,
    driverOptions: {
      connection: { ssl: { rejectUnauthorized: false } },
    },
  }),
  ...(process.env.NODE_ENV !== "production" && {
    user: "user",
    password: "password",
    dbName: "imessage2spotify",
    ...(process.env.IN_DOCKER_COMPOSE === "true" && { host: "db" }),
  }),
  type: "postgresql",
  migrations: {
    path: process.cwd() + "/src/migrations",
    disableForeignKeys: false,
  },
} as Partial<MikroORMOptions>;
