/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ref, type MikroORM } from "@mikro-orm/core";
import { Author } from "../entities/Author.js";
import { Chat } from "../entities/Chat.js";
import { Message } from "../entities/Message.js";
import { Publisher } from "../entities/Publisher.js";
import { Book } from "../entities/Book.js";

export async function populateDatabase(em: MikroORM["em"]): Promise<void> {
  const authors = [
    new Author({ id: 1, name: "a", email: "a@a.com" }),
    new Author({ id: 2, name: "b", email: "b@b.com" }),
    new Author({ id: 3, name: "c", email: "c@c.com" }),
    new Author({ id: 4, name: "d", email: "d@d.com" }),
    new Author({ id: 5, name: "e", email: "e@e.com" }),
  ];
  authors[0]!.friends.add([authors[1]!, authors[3]!, authors[4]!]);
  authors[0]!.friends.add([authors[1]!, authors[3]!, authors[4]!]);
  authors[1]!.friends.add([authors[0]!]);
  authors[2]!.friends.add([authors[3]!]);
  authors[3]!.friends.add([authors[0]!, authors[2]!]);
  authors[4]!.friends.add([authors[0]!]);
  authors[0]!.buddies.add([authors[1]!, authors[3]!, authors[4]!]);
  authors[0]!.buddies.add([authors[1]!, authors[3]!, authors[4]!]);
  authors[1]!.buddies.add([authors[0]!]);
  authors[2]!.buddies.add([authors[3]!]);
  authors[3]!.buddies.add([authors[0]!, authors[2]!]);
  authors[4]!.buddies.add([authors[0]!]);
  em.persist(authors);

  const chats = [
    new Chat({ owner: authors[0]!, recipient: authors[1]! }),
    new Chat({ owner: authors[0]!, recipient: authors[2]! }),
    new Chat({ owner: authors[0]!, recipient: authors[4]! }),
    new Chat({ owner: authors[2]!, recipient: authors[0]! }),
  ];
  chats[0]!.messages.add([new Message({ content: "A1" }), new Message({ content: "A2" })]);
  chats[1]!.messages.add([new Message({ content: "B1" }), new Message({ content: "B2" })]);
  chats[3]!.messages.add([new Message({ content: "C1" })]);
  em.persist(chats);

  const publishers = [new Publisher({ id: 1, name: "AAA" }), new Publisher({ id: 2, name: "BBB" })];
  em.persist(publishers);

  const books = [
    new Book({ id: 1, title: "One", author: authors[0]! }),
    new Book({ id: 2, title: "Two", author: authors[0]! }),
    new Book({ id: 3, title: "Three", author: authors[1]! }),
    new Book({ id: 4, title: "Four", author: authors[2]! }),
    new Book({ id: 5, title: "Five", author: authors[2]! }),
    new Book({ id: 6, title: "Six", author: authors[2]! }),
  ];
  books[0]!.publisher = ref(publishers[0]!);
  books[1]!.publisher = ref(publishers[1]!);
  books[2]!.publisher = ref(publishers[1]!);
  books[3]!.publisher = ref(publishers[1]!);
  books[4]!.publisher = ref(publishers[1]!);
  books[5]!.publisher = ref(publishers[1]!);
  em.persist(books);

  await em.flush();
  em.clear();
}
