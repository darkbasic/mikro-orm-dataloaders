/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/array-type */
import {
  type EntityManager,
  type AnyEntity,
  type Primary,
  type FilterQuery,
  type FindOptions,
  Utils,
  EntityRepository,
  type EntityName,
  type EntityKey,
  type Loaded,
  type EntityProps,
  type ExpandProperty,
  type ExpandScalar,
  type FilterItemValue,
  type ExpandQuery,
  type Scalar,
} from "@mikro-orm/core";
import DataLoader from "dataloader";
import { type DataloaderFind, groupFindQueries, assertHasNewFilterAndMapKey } from "./findDataloader";

export interface OperatorMapDataloader<T> {
  // $and?: ExpandQuery<T>[];
  $or?: Array<ExpandQuery<T>>;
  // $eq?: ExpandScalar<T> | ExpandScalar<T>[];
  // $ne?: ExpandScalar<T>;
  // $in?: ExpandScalar<T>[];
  // $nin?: ExpandScalar<T>[];
  // $not?: ExpandQuery<T>;
  // $gt?: ExpandScalar<T>;
  // $gte?: ExpandScalar<T>;
  // $lt?: ExpandScalar<T>;
  // $lte?: ExpandScalar<T>;
  // $like?: string;
  // $re?: string;
  // $ilike?: string;
  // $fulltext?: string;
  // $overlap?: string[];
  // $contains?: string[];
  // $contained?: string[];
  // $exists?: boolean;
}

export type FilterValueDataloader<T> =
  /* OperatorMapDataloader<FilterItemValue<T>> | */
  FilterItemValue<T> | FilterItemValue<T>[] | null;

export type QueryDataloader<T> = T extends object
  ? T extends Scalar
    ? never
    : FilterQueryDataloader<T>
  : FilterValueDataloader<T>;

export type FilterObjectDataloader<T> = {
  -readonly [K in EntityKey<T>]?:
    | QueryDataloader<ExpandProperty<T[K]>>
    | FilterValueDataloader<ExpandProperty<T[K]>>
    | null;
};

export type Compute<T> = {
  [K in keyof T]: T[K];
} & {};

export type ObjectQueryDataloader<T> = Compute<OperatorMapDataloader<T> & FilterObjectDataloader<T>>;

// FilterQuery<T>
export type FilterQueryDataloader<T extends object> =
  | ObjectQueryDataloader<T>
  | NonNullable<ExpandScalar<Primary<T>>> // Just 5 (or [5, 7] for composite keys). Currently not supported, we do {id: number} instead. Should be easy to add.
  // Accepts {id: 5} or any scalar like {name: "abc"}, IdentifiedReference (because it extends {id: 5}) but not just 5 nor {location: IdentifiedReference} (don't know why).
  // OperatorMap must be cut down to just a couple.
  | NonNullable<EntityProps<T> & OperatorMapDataloader<T>>
  | FilterQueryDataloader<T>[];

export class EntityDataLoader<T extends AnyEntity<T> = any, P extends string = never, F extends string = never> {
  private readonly bypass: boolean;
  private readonly findLoader: DataLoader<
    Omit<DataloaderFind<T, P, F>, "filtersAndKeys">,
    Array<Loaded<T, P, F>> | Loaded<T, P, F> | null
  >;

  constructor(
    private readonly em: EntityManager,
    bypass: boolean = false,
  ) {
    this.bypass = bypass;

    this.findLoader = new DataLoader<
      Omit<DataloaderFind<T, P, F>, "filtersAndKeys">,
      Array<Loaded<T, P, F>> | Loaded<T, P, F> | null
    >(async (dataloaderFinds) => {
      const queriesMap = groupFindQueries(dataloaderFinds);
      assertHasNewFilterAndMapKey(dataloaderFinds);
      const resultsMap = new Map<string, any[] | Error>();
      await Promise.all(
        Array.from(queriesMap, async ([key, [filter, options]]): Promise<void> => {
          const entityName = key.substring(0, key.indexOf("|"));
          let entitiesOrError: any[] | Error;
          const findOptions = {
            ...(options?.populate != null && {
              populate: options.populate === true ? ["*"] : Array.from(options.populate),
            }),
          } satisfies Pick<FindOptions<any, any>, "populate">;
          try {
            entitiesOrError = await em.getRepository(entityName).find(filter, findOptions);
          } catch (e) {
            entitiesOrError = e as Error;
          }
          resultsMap.set(key, entitiesOrError);
        }),
      );

      return dataloaderFinds.map(({ filtersAndKeys, many }) => {
        const res = filtersAndKeys.reduce<any[]>((acc, { key, newFilter }) => {
          const entitiesOrError = resultsMap.get(key);
          if (entitiesOrError == null) {
            throw new Error("Cannot match results");
          }

          if (!(entitiesOrError instanceof Error)) {
            const res = entitiesOrError[many ? "filter" : "find"]((entity) => {
              return filterResult(entity, newFilter);
            });
            acc.push(...(Array.isArray(res) ? res : [res]));
            return acc;
          } else {
            throw entitiesOrError;
          }
        }, []);
        return many ? res : res[0] ?? null;
      });

      function filterResult<K extends object>(entity: K, filter: FilterQueryDataloader<K>): boolean {
        for (const [key, value] of Object.entries(filter)) {
          const entityValue = entity[key as keyof K];
          if (Array.isArray(value)) {
            if (Array.isArray(entityValue)) {
              // Collection
              if (!value.every((el) => entityValue.includes(el))) {
                return false;
              }
            } else {
              // Single value
              if (!value.includes(entityValue)) {
                return false;
              }
            }
          } else {
            // Object: recursion
            if (!filterResult(entityValue as object, value)) {
              return false;
            }
          }
        }
        return true;
      }
    });
  }

  async find<K extends object, Hint extends string = never, Fields extends string = never>(
    repoOrClass: EntityRepository<K> | EntityName<K>,
    filter: FilterQueryDataloader<K>,
    options?: Pick<FindOptions<K, Hint, Fields>, "populate"> & { bypass?: boolean },
  ): Promise<Array<Loaded<K, Hint, Fields>>> {
    // Property 'entityName' is protected and only accessible within class 'EntityRepository<Entity>' and its subclasses.
    const entityName = Utils.className(
      repoOrClass instanceof EntityRepository ? repoOrClass["entityName"] : repoOrClass,
    );
    return options?.bypass ?? this.bypass
      ? await (repoOrClass instanceof EntityRepository
          ? repoOrClass.find(filter as FilterQuery<K>, options)
          : this.em.find(repoOrClass, filter as FilterQuery<K>, options))
      : await (this.findLoader.load({
          entityName,
          meta: this.em.getMetadata().get(entityName),
          filter: filter as FilterQueryDataloader<T>,
          options: options as Pick<FindOptions<T, P, F>, "populate">,
          many: true,
        }) as unknown as Promise<Array<Loaded<K, Hint, Fields>>>);
  }

  async findOne<K extends object, Hint extends string = never, Fields extends string = never>(
    repoOrClass: EntityRepository<K> | EntityName<K>,
    filter: FilterQueryDataloader<K>,
    options?: Pick<FindOptions<K, Hint, Fields>, "populate"> & { bypass?: boolean },
  ): Promise<Loaded<K, Hint, Fields> | null> {
    // Property 'entityName' is protected and only accessible within class 'EntityRepository<Entity>' and its subclasses.
    const entityName = Utils.className(
      repoOrClass instanceof EntityRepository ? repoOrClass["entityName"] : repoOrClass,
    );
    return options?.bypass ?? this.bypass
      ? await (repoOrClass instanceof EntityRepository
          ? repoOrClass.findOne(filter as FilterQuery<K>, options)
          : this.em.findOne(repoOrClass, filter as FilterQuery<K>, options))
      : await (this.findLoader.load({
          entityName,
          meta: this.em.getMetadata().get(entityName),
          filter: filter as FilterQueryDataloader<T>,
          options: options as Pick<FindOptions<T, P, F>, "populate">,
          many: false,
        }) as unknown as Promise<Loaded<K, Hint, Fields> | null>);
  }

  async findOneOrFail<K extends object, Hint extends string = never, Fields extends string = never>(
    repoOrClass: EntityRepository<K> | EntityName<K>,
    filter: FilterQueryDataloader<K>,
    options?: Pick<FindOptions<K, Hint, Fields>, "populate"> & { bypass?: boolean },
  ): Promise<Loaded<K, Hint, Fields>> {
    // Property 'entityName' is protected and only accessible within class 'EntityRepository<Entity>' and its subclasses.
    const entityName = Utils.className(
      repoOrClass instanceof EntityRepository ? repoOrClass["entityName"] : repoOrClass,
    );
    if (options?.bypass ?? this.bypass) {
      return await (repoOrClass instanceof EntityRepository
        ? repoOrClass.findOneOrFail(filter as FilterQuery<K>, options)
        : this.em.findOneOrFail(repoOrClass, filter as FilterQuery<K>, options));
    }
    const one = (await this.findLoader.load({
      entityName,
      meta: this.em.getMetadata().get(entityName),
      filter: filter as FilterQueryDataloader<T>,
      options: options as Pick<FindOptions<T, P, F>, "populate">,
      many: false,
    })) as unknown as Loaded<K, Hint, Fields> | null;
    if (one == null) {
      throw new Error("Cannot find result");
    }
    return one;
  }
}
