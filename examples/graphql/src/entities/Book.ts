import { Entity, EntityRepositoryType, ManyToOne, PrimaryKey, Property, Ref, ref } from "@mikro-orm/core";
import { Author } from "./Author";
import { Publisher } from "./Publisher";
import { type IFindDataloaderEntityRepository } from "mikro-orm-find-dataloader";
import { type findDataloaderDefault } from "../mikro-orm-config";

@Entity()
export class Book {
  @PrimaryKey()
  id!: number;

  @Property()
  title: string;

  @ManyToOne(() => Author, { ref: true })
  author: Ref<Author>;

  @ManyToOne(() => Publisher, { ref: true, nullable: true })
  publisher!: Ref<Publisher> | null;

  [EntityRepositoryType]?: IFindDataloaderEntityRepository<Book, typeof findDataloaderDefault>;

  constructor({ id, title, author }: { id?: number; title: string; author: Author | Ref<Author> }) {
    if (id != null) {
      this.id = id;
    }
    this.title = title;
    this.author = ref(author);
  }
}
