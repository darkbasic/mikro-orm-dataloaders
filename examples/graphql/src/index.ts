/* eslint-disable @typescript-eslint/no-misused-promises */
import { createSchema, createYoga } from "graphql-yoga";
import { MikroORM } from "@mikro-orm/sqlite";
import config from "./mikro-orm-config";
import { populateDatabase } from "./utils/populateDatabase";
import { assertSingleValue, executeOperation } from "./utils/yoga";
import gql from "graphql-tag";
import { Book } from "./entities/Book";
import { Author } from "./entities/Author";
import { EntityDataLoader } from "mikro-orm-find-dataloader";
import { type EntityManager } from "@mikro-orm/core";

const getAuthorsQuery = gql`
  {
    authors {
      id
      name
      books {
        id
        title
      }
    }
  }
`;

void (async () => {
  const orm = await MikroORM.init(config);
  let em: EntityManager;
  em = orm.em.fork();
  try {
    await orm.schema.clearDatabase();
  } catch (e) {
    console.log("Couldn't clear databse");
  }
  try {
    const generator = orm.getSchemaGenerator();
    await generator.createSchema({ wrap: true });
  } catch {
    console.log("Schema has already been created");
  }
  await populateDatabase(em);
  em = orm.em.fork();

  const entityDataLoader = new EntityDataLoader(em);

  const schema = createSchema({
    typeDefs: gql`
      type Query {
        authors: [Author!]!
      }
      type Author {
        id: ID!
        name: String!
        books: [Book!]!
      }
      type Book {
        id: ID!
        title: String!
        author: Author!
      }
    `,
    resolvers: {
      Query: {
        authors: async () => await em.find(Author, {}),
      },
      Author: {
        books: async (author: Author) => {
          // return await author.books.load();
          // return await author.books.load({ dataloader: true });
          // return await em.find(Book, { author: author.id });
          return entityDataLoader.find(Book, { author: author.id });
        },
      },
    },
  });

  const yoga = createYoga({ schema });
  const res = await executeOperation(yoga, getAuthorsQuery);
  assertSingleValue(res);
  console.log(res.data.authors);
})();
