/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  type SqlEntityManager,
  MikroORM,
  Entity,
  PrimaryKey,
  Property,
  Collection,
  OneToMany,
  Ref,
  ref,
  ManyToOne,
} from "@mikro-orm/sqlite";
import { EntityDataLoader } from "../src/EntityDataLoader.js";

@Entity()
class Author {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @OneToMany(() => Book, (book) => book.author)
  books = new Collection<Book>(this);

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
  let emFork: SqlEntityManager;
  let dataloader: EntityDataLoader;

  beforeAll(async () => {
    orm = await MikroORM.init({
      dbName: ":memory:",
      entities: [Author, Book],
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
    emFork = orm.em.fork();
    dataloader = new EntityDataLoader(orm.em.fork());
  });

  it("should fetch books with the find dataloader", async () => {
    const authors = await emFork.find(Author, {});
    const authorBooks = await Promise.all(authors.map(async ({ id }) => await dataloader.find(Book, { author: id })));
    expect(authorBooks).toBeDefined();
    expect(authorBooks).toMatchSnapshot();
  });

  it("should return the same books as find", async () => {
    const authors = await emFork.find(Author, {});
    const dataloaderBooks = await Promise.all(
      authors.map(async ({ id }) => await dataloader.find(Book, { author: id })),
    );
    const findBooks = await Promise.all(authors.map(async ({ id }) => await emFork.find(Book, { author: id })));
    expect(dataloaderBooks.map((res) => res.map(({ id }) => id))).toEqual(
      findBooks.map((res) => res.map(({ id }) => id)),
    );
  });

  afterEach(async () => {});

  afterAll(async () => {
    await orm.close(true);
  });
});
