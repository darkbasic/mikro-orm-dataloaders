import { Author } from "./entities/Author.js";
import { Book } from "./entities/Book.js";
import { Chat } from "./entities/Chat.js";
import { Message } from "./entities/Message.js";
import { Publisher } from "./entities/Publisher.js";

export default {
  entities: [Author, Book, Chat, Message, Publisher],
  dbName: ":memory:",
  debug: true,
};
