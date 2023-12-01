import { Entity, EntityRepositoryType, ManyToOne, PrimaryKey, Property, Ref, ref } from "@mikro-orm/core";
import { Chat } from "./Chat";
import { type IFindDataloaderEntityRepository } from "mikro-orm-find-dataloader";
import { type findDataloaderDefault } from "../mikro-orm-config";

@Entity()
export class Message {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Chat, { ref: true })
  chat!: Ref<Chat>;

  @Property()
  content: string;

  [EntityRepositoryType]?: IFindDataloaderEntityRepository<Message, typeof findDataloaderDefault>;

  constructor({ id, chat, content }: { id?: number; chat?: Chat | Ref<Chat>; content: string }) {
    if (id != null) {
      this.id = id;
    }
    if (chat != null) {
      this.chat = ref(chat);
    }
    this.content = content;
  }
}
