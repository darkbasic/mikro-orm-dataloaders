/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  MikroORM,
  Entity,
  PrimaryKey,
  Property,
  Collection,
  OneToMany,
  Ref,
  ref,
  ManyToOne,
  EntityRepositoryType,
  SimpleLogger,
  type SqlEntityManager,
} from "@mikro-orm/sqlite";
import { type IFindDataloaderEntityRepository, getFindDataloaderEntityRepository } from "./findRepository";
import { type LoggerNamespace } from "@mikro-orm/core";

function mockLogger(
  orm: MikroORM,
  debug: LoggerNamespace[] = ["query", "query-params"],
  mock = jest.fn(),
): jest.Mock<any, any, any> {
  const logger = orm.config.getLogger();
  Object.assign(logger, { writer: mock });
  orm.config.set("debug", debug);
  logger.setDebugMode(debug);

  return mock;
}

const findDataloaderDefault = true;

@Entity()
class Author {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @OneToMany(() => Book, (book) => book.author)
  books = new Collection<Book>(this);

  [EntityRepositoryType]?: IFindDataloaderEntityRepository<Author, typeof findDataloaderDefault>;

  constructor({ id, name }: { id?: number; name: string }) {
    if (id != null) {
      this.id = id;
    }
    this.name = name;
  }
}

@Entity()
class Book {
  @PrimaryKey()
  id!: number;

  @Property()
  title: string;

  @ManyToOne(() => Author, { ref: true })
  author: Ref<Author>;

  [EntityRepositoryType]?: IFindDataloaderEntityRepository<Book, typeof findDataloaderDefault>;

  constructor({ id, title, author }: { id?: number; title: string; author: Author | Ref<Author> }) {
    if (id != null) {
      this.id = id;
    }
    this.title = title;
    this.author = ref(author);
  }
}

async function populateDatabase(em: MikroORM["em"]): Promise<void> {
  const authors = [
    new Author({ id: 1, name: "a" }),
    new Author({ id: 2, name: "b" }),
    new Author({ id: 3, name: "c" }),
    new Author({ id: 4, name: "d" }),
    new Author({ id: 5, name: "e" }),
  ];
  em.persist(authors);

  const books = [
    new Book({ id: 1, title: "One", author: authors[0]! }),
    new Book({ id: 2, title: "Two", author: authors[0]! }),
    new Book({ id: 3, title: "Three", author: authors[1]! }),
    new Book({ id: 4, title: "Four", author: authors[2]! }),
    new Book({ id: 5, title: "Five", author: authors[2]! }),
    new Book({ id: 6, title: "Six", author: authors[2]! }),
  ];
  em.persist(books);
  await em.flush();
}

describe("find", () => {
  let orm: MikroORM;
  let em: SqlEntityManager;

  beforeAll(async () => {
    orm = await MikroORM.init({
      entityRepository: getFindDataloaderEntityRepository(findDataloaderDefault),
      dbName: ":memory:",
      entities: [Author, Book],
      loggerFactory: (options) => new SimpleLogger(options),
    });
    try {
      await orm.schema.clearDatabase();
    } catch {}
    try {
      const generator = orm.getSchemaGenerator();
      await generator.createSchema({ wrap: true });
    } catch {}
    await populateDatabase(orm.em.fork());
  });

  beforeEach(async () => {
    em = orm.em.fork();
  });

  it("should fetch books with the find dataloader", async () => {
    const authors = await em.fork().find(Author, {});
    const mock = mockLogger(orm);
    const authorBooks = await Promise.all([
      ...authors.map(async ({ id }) => await em.getRepository(Book).find({ author: id })),
      // em.getRepository(Book).find({ author: { books: { author: 1 } } }),
      // em.getRepository(Book).find({ title: "a", author: [1, { books: { author: 1 } }] }),
      // em.getRepository(Book).find({ title: "a", author: { books: { author: 1 } } }),
      // em.getRepository(Book).find({ title: "a", author: { books: { author: { name: "a" } } } }),
      // em.getRepository(Book).find({ title: "a", author: { books: { title: "a" } } }),
      // em.getRepository(Book).find({ title: "a", author: { books: 1 } }),
      // em.getRepository(Book).find({ author: 1 }),
      // em.getRepository(Book).find({ author: 1 }),
      // em.getRepository(Book).find({ id: 2, title: "b", author: { id: 1, name: "a" } }),
      // em.getRepository(Book).find({ author: { id: 1, name: "a" } }),
      // em.getRepository(Book).find({ author: { id: 2 } }),
      // em.getRepository(Book).find({ author: { id: 3 } }),
      // em.getRepository(Book).find({ author: { name: "a" } }),
    ]);
    // console.log(mock.mock.calls);
    expect(authorBooks).toBeDefined();
    expect(authorBooks).toMatchSnapshot();
    expect(mock.mock.calls).toEqual([
      ["[query] select `b0`.* from `book` as `b0` where `b0`.`author_id` in (1, 2, 3, 4, 5)"],
    ]);
  });

  it("should return the same books as find", async () => {
    const authors = await em.fork().find(Author, {});
    const dataloaderBooks = await Promise.all(
      authors.map(async ({ id }) => await em.getRepository(Book).find({ author: id })),
    );
    const findBooks = await Promise.all(authors.map(async ({ id }) => await em.fork().find(Book, { author: id })));
    expect(dataloaderBooks.map((res) => res.map(({ id }) => id))).toEqual(
      findBooks.map((res) => res.map(({ id }) => id)),
    );
  });

  afterEach(async () => {});

  afterAll(async () => {
    await orm.close(true);
  });
});
