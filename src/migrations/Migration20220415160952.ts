import { Migration } from '@mikro-orm/migrations';

export class Migration20220415160952 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "songs" add column "spotify_preview_url" varchar(255) null;');
  }

}
