import { Migration } from "@mikro-orm/migrations";

export class Migration20211118034826 extends Migration {
  async up(): Promise<void> {
    this.addSql("CREATE EXTENSION pg_prewarm;");
    this.addSql(
      'create table "cache" ("cache_type" text check ("cache_type" in (\'default\', \'pageLatest\')) not null, "valid" bool not null, "data" text null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null);'
    );
    this.addSql(
      'alter table "cache" add constraint "cache_pkey" primary key ("cache_type");'
    );
  }
}
