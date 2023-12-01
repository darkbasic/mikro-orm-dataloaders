import { Collection, Entity, EntityRepositoryType, Enum, OneToMany, PrimaryKey, Property } from "@mikro-orm/core";
import { Book } from "./Book";
import { type IFindDataloaderEntityRepository } from "mikro-orm-find-dataloader";
import { type findDataloaderDefault } from "../mikro-orm-config";

export enum PublisherType {
  LOCAL = "local",
  GLOBAL = "global",
}

@Entity()
export class Publisher {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @OneToMany(() => Book, (book) => book.publisher)
  books = new Collection<Book, Publisher>(this);

  @Enum(() => PublisherType)
  type = PublisherType.LOCAL;

  [EntityRepositoryType]?: IFindDataloaderEntityRepository<Publisher, typeof findDataloaderDefault>;

  constructor({ id, name = "asd", type = PublisherType.LOCAL }: { id?: number; name?: string; type?: PublisherType }) {
    if (id != null) {
      this.id = id;
    }
    this.name = name;
    this.type = type;
  }
}
