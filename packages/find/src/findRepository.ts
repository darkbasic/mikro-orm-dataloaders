/* eslint-disable @typescript-eslint/method-signature-style */
import {
  EntityRepository,
  type EntityManager,
  type FindOptions,
  type Loaded,
  type EntityName,
  Utils,
  type FilterQuery,
  type FindOneOptions,
  type FindOneOrFailOptions,
} from "@mikro-orm/core";
import DataLoader from "dataloader";
import { type FilterQueryDataloader, getFindBatchLoadFn } from "./findDataloader";

export interface IFindDataloaderEntityRepository<Entity extends object, D extends boolean>
  extends EntityRepository<Entity> {
  readonly dataloader: D;

  find<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: FilterQuery<Entity>,
    options?: { dataloader: false } & FindOptions<Entity, Hint, Fields, Excludes>,
  ): Promise<Array<Loaded<Entity, Hint, Fields, Excludes>>>;
  find<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: FilterQueryDataloader<Entity>,
    options?: { dataloader: boolean } & Pick<FindOptions<Entity, Hint, Fields, Excludes>, "populate">,
  ): Promise<Array<Loaded<Entity, Hint, Fields, Excludes>>>;
  find<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: D extends true ? FilterQueryDataloader<Entity> : FilterQueryDataloader<Entity> | FilterQuery<Entity>,
    options?: { dataloader?: undefined } & (D extends true
      ? Pick<FindOptions<Entity, Hint, Fields, Excludes>, "populate">
      : FindOptions<Entity, Hint, Fields, Excludes>),
  ): Promise<Array<Loaded<Entity, Hint, Fields, Excludes>>>;

  findOne<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: FilterQuery<Entity>,
    options?: { dataloader: false } & FindOneOptions<Entity, Hint, Fields, Excludes>,
  ): Promise<Loaded<Entity, Hint, Fields, Excludes> | null>;
  findOne<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: FilterQueryDataloader<Entity>,
    options?: { dataloader: boolean } & Pick<FindOneOptions<Entity, Hint, Fields, Excludes>, "populate">,
  ): Promise<Loaded<Entity, Hint, Fields, Excludes> | null>;
  findOne<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: D extends true ? FilterQueryDataloader<Entity> : FilterQueryDataloader<Entity> | FilterQuery<Entity>,
    options?: { dataloader?: undefined } & (D extends true
      ? Pick<FindOneOptions<Entity, Hint, Fields, Excludes>, "populate">
      : FindOneOptions<Entity, Hint, Fields, Excludes>),
  ): Promise<Loaded<Entity, Hint, Fields, Excludes> | null>;

  findOneOrFail<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: FilterQuery<Entity>,
    options?: { dataloader: false } & FindOneOrFailOptions<Entity, Hint, Fields, Excludes>,
  ): Promise<Loaded<Entity, Hint, Fields, Excludes>>;
  findOneOrFail<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: FilterQueryDataloader<Entity>,
    options?: { dataloader: boolean } & Pick<FindOneOrFailOptions<Entity, Hint, Fields, Excludes>, "populate">,
  ): Promise<Loaded<Entity, Hint, Fields, Excludes>>;
  findOneOrFail<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
    where: D extends true ? FilterQueryDataloader<Entity> : FilterQueryDataloader<Entity> | FilterQuery<Entity>,
    options?: { dataloader?: undefined } & (D extends true
      ? Pick<FindOneOrFailOptions<Entity, Hint, Fields, Excludes>, "populate">
      : FindOneOrFailOptions<Entity, Hint, Fields, Excludes>),
  ): Promise<Loaded<Entity, Hint, Fields, Excludes>>;
}

export type FindDataloaderEntityRepositoryCtor<Entity extends object, D extends boolean> = new (
  em: EntityManager,
  entityName: EntityName<Entity>,
) => IFindDataloaderEntityRepository<Entity, D>;

export function getFindDataloaderEntityRepository<Entity extends object, D extends boolean>(
  defaultEnabled: D,
): FindDataloaderEntityRepositoryCtor<Entity, D> {
  class FindDataloaderEntityRepository
    extends EntityRepository<Entity>
    implements IFindDataloaderEntityRepository<Entity, D>
  {
    readonly dataloader = defaultEnabled;
    private readonly findLoader = new DataLoader(getFindBatchLoadFn(this.em, this.entityName));

    async find<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
      where: FilterQueryDataloader<Entity> | FilterQuery<Entity>,
      options?: { dataloader?: boolean } & (
        | Pick<FindOptions<Entity, Hint, Fields, Excludes>, "populate">
        | FindOptions<Entity, Hint, Fields, Excludes>
      ),
    ): Promise<Array<Loaded<Entity, Hint, Fields, Excludes>>> {
      const entityName = Utils.className(this.entityName);
      const res = await (options?.dataloader ?? this.dataloader
        ? this.findLoader.load({
            entityName,
            meta: this.em.getMetadata().get(entityName),
            filter: where,
            options,
            many: true,
          })
        : this.em.find<Entity, Hint, Fields, Excludes>(this.entityName, where as FilterQuery<Entity>, options));
      return res as Array<Loaded<Entity, Hint, Fields, Excludes>>;
    }

    async findOne<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
      where: FilterQueryDataloader<Entity> | FilterQuery<Entity>,
      options?: { dataloader?: boolean } & (
        | Pick<FindOneOptions<Entity, Hint, Fields, Excludes>, "populate">
        | FindOneOptions<Entity, Hint, Fields, Excludes>
      ),
    ): Promise<Loaded<Entity, Hint, Fields, Excludes> | null> {
      const entityName = Utils.className(this.entityName);
      const res = await (options?.dataloader ?? this.dataloader
        ? this.findLoader.load({
            entityName,
            meta: this.em.getMetadata().get(entityName),
            filter: where,
            options,
            many: false,
          })
        : this.em.findOne<Entity, Hint, Fields, Excludes>(this.entityName, where as FilterQuery<Entity>, options));
      return res as Loaded<Entity, Hint, Fields, Excludes> | null;
    }

    async findOneOrFail<Hint extends string = never, Fields extends string = "*", Excludes extends string = never>(
      where: FilterQueryDataloader<Entity> | FilterQuery<Entity>,
      options?: { dataloader?: boolean } & (
        | Pick<FindOneOrFailOptions<Entity, Hint, Fields, Excludes>, "populate">
        | FindOneOrFailOptions<Entity, Hint, Fields, Excludes>
      ),
    ): Promise<Loaded<Entity, Hint, Fields, Excludes>> {
      const entityName = Utils.className(this.entityName);
      const res = await (options?.dataloader ?? this.dataloader
        ? this.findLoader.load({
            entityName,
            meta: this.em.getMetadata().get(entityName),
            filter: where,
            options,
            many: false,
          })
        : this.em.findOneOrFail<Entity, Hint, Fields, Excludes>(
            this.entityName,
            where as FilterQuery<Entity>,
            options,
          ));
      if (res == null) {
        throw new Error("Cannot find result");
      }
      return res as Loaded<Entity, Hint, Fields, Excludes>;
    }
  }

  return FindDataloaderEntityRepository as FindDataloaderEntityRepositoryCtor<Entity, D>;
}
