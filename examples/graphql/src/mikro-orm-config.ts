import { type Options } from "@mikro-orm/sqlite";
import { Author } from "./entities/Author";
import { Book } from "./entities/Book";
import { Chat } from "./entities/Chat";
import { Message } from "./entities/Message";
import { Publisher } from "./entities/Publisher";
import { getFindDataloaderEntityRepository } from "mikro-orm-find-dataloader";

export const findDataloaderDefault = false;

export default {
  entityRepository: getFindDataloaderEntityRepository(findDataloaderDefault),
  entities: [Author, Book, Chat, Message, Publisher],
  dbName: ":memory:",
  debug: true,
} satisfies Options;
