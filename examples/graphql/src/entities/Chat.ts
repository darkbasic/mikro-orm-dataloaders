import { Collection, Entity, ManyToOne, OneToMany, PrimaryKeyProp, Ref, ref } from "@mikro-orm/core";
import { Author } from "./Author.js";
import { Message } from "./Message.js";

@Entity()
export class Chat {
  @ManyToOne(() => Author, { ref: true, primary: true })
  owner: Ref<Author>;

  @ManyToOne(() => Author, { ref: true, primary: true })
  recipient: Ref<Author>;

  [PrimaryKeyProp]?: ["owner", "recipient"];

  @OneToMany(() => Message, (message) => message.chat)
  messages: Collection<Message> = new Collection<Message>(this);

  constructor({ owner, recipient }: { owner: Author | Ref<Author>; recipient: Author | Ref<Author> }) {
    this.owner = ref(owner);
    this.recipient = ref(recipient);
  }
}
