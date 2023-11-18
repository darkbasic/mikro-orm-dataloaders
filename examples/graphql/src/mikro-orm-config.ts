import { Author } from "./entities/Author";
import { Book } from "./entities/Book";
import { Chat } from "./entities/Chat";
import { Message } from "./entities/Message";
import { Publisher } from "./entities/Publisher";

export default {
  entities: [Author, Book, Chat, Message, Publisher],
  dbName: ":memory:",
  debug: true,
};
