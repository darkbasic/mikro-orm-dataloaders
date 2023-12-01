import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  PrimaryKeyProp,
  Ref,
  ref,
} from "@mikro-orm/core";
import { Author } from "./Author";
import { Message } from "./Message";
import { type IFindDataloaderEntityRepository } from "mikro-orm-find-dataloader";
import { type findDataloaderDefault } from "../mikro-orm-config";

@Entity()
export class Chat {
  @ManyToOne(() => Author, { ref: true, primary: true })
  owner: Ref<Author>;

  @ManyToOne(() => Author, { ref: true, primary: true })
  recipient: Ref<Author>;

  [PrimaryKeyProp]?: ["owner", "recipient"];

  @OneToMany(() => Message, (message) => message.chat)
  messages: Collection<Message> = new Collection<Message>(this);

  [EntityRepositoryType]?: IFindDataloaderEntityRepository<Chat, typeof findDataloaderDefault>;

  constructor({ owner, recipient }: { owner: Author | Ref<Author>; recipient: Author | Ref<Author> }) {
    this.owner = ref(owner);
    this.recipient = ref(recipient);
  }
}
