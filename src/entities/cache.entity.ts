import { AfterUpdate, Entity, PrimaryKey, Property } from "@mikro-orm/core";

export enum CacheType {
  default = "default",
  pageLatest = "pageLatest",
}

@Entity({ tableName: "cache" })
export class Cache {
  @PrimaryKey()
  cacheType: CacheType = CacheType.default;

  @Property()
  valid: boolean = true;

  @Property({ type: "text", nullable: true })
  data!: string;

  @Property()
  createdAt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt = new Date();
}
