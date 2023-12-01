import { Collection, Entity, EntityRepositoryType, ManyToMany, OneToMany, PrimaryKey, Property } from "@mikro-orm/core";
import { Book } from "./Book";
import { Chat } from "./Chat";
import { type IFindDataloaderEntityRepository } from "mikro-orm-find-dataloader";
import { type findDataloaderDefault } from "../mikro-orm-config";

@Entity()
export class Author {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @Property()
  email: string;

  @OneToMany(() => Book, (book) => book.author)
  books = new Collection<Book>(this);

  // No inverse side exists
  @ManyToMany(() => Author)
  friends = new Collection<Author>(this);

  // Inverse side exists
  @ManyToMany(() => Author)
  buddies = new Collection<Author>(this);

  @ManyToMany(() => Author, (author) => author.buddies)
  buddiesInverse = new Collection<Author>(this);

  @OneToMany(() => Chat, (chat) => chat.owner)
  ownedChats: Collection<Chat> = new Collection<Chat>(this);

  [EntityRepositoryType]?: IFindDataloaderEntityRepository<Author, typeof findDataloaderDefault>;

  constructor({ id, name, email }: { id?: number; name: string; email: string }) {
    if (id != null) {
      this.id = id;
    }
    this.name = name;
    this.email = email;
  }
}
