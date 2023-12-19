import {
  Utils,
  Collection,
  helper,
  type FindOptions,
  type AnyEntity,
  type Reference,
  type Primary,
  type EntityMetadata,
  type EntityKey,
  type FilterItemValue,
  type Scalar,
  type ExpandProperty,
  type ExpandScalar,
  type EntityProps,
  type EntityManager,
  type EntityName,
} from "@mikro-orm/core";
import { type PartialBy } from "./types";
import type DataLoader from "dataloader";

/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/array-type */

export interface OperatorMapDataloader<T> {
  // $and?: ExpandQuery<T>[];
  $or?: Array<ExpandQueryDataloader<T>>;
  // $eq?: ExpandScalar<T> | ExpandScalar<T>[];
  // $ne?: ExpandScalar<T>;
  // $in?: ExpandScalar<T>[];
  // $nin?: ExpandScalar<T>[];
  // $not?: ExpandQuery<T>;
  // $none?: ExpandQuery<T>;
  // $some?: ExpandQuery<T>;
  // $every?: ExpandQuery<T>;
  // $gt?: ExpandScalar<T>;
  // $gte?: ExpandScalar<T>;
  // $lt?: ExpandScalar<T>;
  // $lte?: ExpandScalar<T>;
  // $like?: string;
  // $re?: string;
  // $ilike?: string;
  // $fulltext?: string;
  // $overlap?: string[] | object;
  // $contains?: string[] | object;
  // $contained?: string[] | object;
  // $exists?: boolean;
}

export type FilterValueDataloader<T> =
  /* OperatorMapDataloader<FilterItemValue<T>> | */
  FilterItemValue<T> | FilterItemValue<T>[] | null;

export type ExpandQueryDataloader<T> = T extends object
  ? T extends Scalar
    ? never
    : FilterQueryDataloader<T>
  : FilterValueDataloader<T>;

export type FilterObjectDataloader<T> = {
  -readonly [K in EntityKey<T>]?:
    | ExpandQueryDataloader<ExpandProperty<T[K]>>
    | FilterValueDataloader<ExpandProperty<T[K]>>
    | null;
};

export type ExpandObjectDataloader<T> = T extends object
  ? T extends Scalar
    ? never
    : FilterObjectDataloader<T>
  : never;

export type ObjectQueryDataloader<T> = OperatorMapDataloader<T> & ExpandObjectDataloader<T>;

// FilterQuery<T>
export type FilterQueryDataloader<T extends object> =
  | ObjectQueryDataloader<T>
  | NonNullable<ExpandScalar<Primary<T>>> // Just 5 (or [5, 7] for composite keys). Currently not supported, we do {id: number} instead. Should be easy to add.
  // Accepts {id: 5} or any scalar like {name: "abc"}, IdentifiedReference (because it extends {id: 5}) but not just 5 nor {location: IdentifiedReference} (don't know why).
  // OperatorMap must be cut down to just a couple.
  | NonNullable<EntityProps<T> & OperatorMapDataloader<T>>
  | FilterQueryDataloader<T>[];

/* eslint-enable @typescript-eslint/ban-types */
/* eslint-enable @typescript-eslint/array-type */

export function groupPrimaryKeysByEntity<T extends AnyEntity<T>>(
  refs: Array<Reference<T>>,
): Map<string, Set<Primary<T>>> {
  const map = new Map<string, Set<Primary<T>>>();
  for (const ref of refs) {
    const className = helper(ref).__meta.className;
    let primaryKeys = map.get(className);
    if (primaryKeys == null) {
      primaryKeys = new Set();
      map.set(className, primaryKeys);
    }
    primaryKeys.add(helper(ref).getPrimaryKey() as Primary<T>);
  }
  return map;
}

export function groupInversedOrMappedKeysByEntity<T extends AnyEntity<T>>(
  collections: Array<Collection<T, AnyEntity>>,
): Map<string, Map<string, Set<Primary<T>>>> {
  const entitiesMap = new Map<string, Map<string, Set<Primary<T>>>>();
  for (const col of collections) {
    const className = col.property.type;
    let propMap = entitiesMap.get(className);
    if (propMap == null) {
      propMap = new Map();
      entitiesMap.set(className, propMap);
    }
    // Many to Many vs One to Many
    const inversedProp: string | undefined = col.property.inversedBy ?? col.property.mappedBy;
    if (inversedProp == null) {
      throw new Error(
        "Cannot find inversedBy or mappedBy prop: did you forget to set the inverse side of a many-to-many relationship?",
      );
    }
    let primaryKeys = propMap.get(inversedProp);
    if (primaryKeys == null) {
      primaryKeys = new Set();
      propMap.set(inversedProp, primaryKeys);
    }
    primaryKeys.add(helper(col.owner).getPrimaryKey() as Primary<T>);
  }
  return entitiesMap;
}

function allKeysArePK<K extends object>(
  keys: Array<EntityKey<K>> | undefined,
  primaryKeys: Array<EntityKey<K>>,
): boolean {
  if (keys == null) {
    return false;
  }
  if (keys.length !== primaryKeys.length) {
    return false;
  }
  for (const key of keys) {
    if (!primaryKeys.includes(key)) {
      return false;
    }
  }
  return true;
}

// {id: 5, name: "a"} returns false because contains additional fields
// Returns true for all PK formats including {id: 1} or {owner: 1, recipient: 2}
function isPK<K extends object>(filter: FilterQueryDataloader<K>, meta: EntityMetadata<K>): boolean {
  if (meta == null) {
    return false;
  }
  if (meta.compositePK) {
    // COMPOSITE
    if (Array.isArray(filter)) {
      // PK or PK[] or object[]
      // [1, 2]
      // [[1, 2], [3, 4]]
      // [{owner: 1, recipient: 2}, {owner: 3, recipient: 4}]
      // [{owner: 1, recipient: 2, sex: 0}, {owner: 3, recipient: 4, sex: 1}]
      if (Utils.isPrimaryKey(filter, meta.compositePK)) {
        // PK
        return true;
      }
      if (Utils.isPrimaryKey(filter[0], meta.compositePK)) {
        // PK[]
        return true;
      }
      const keys = typeof filter[0] === "object" ? (Object.keys(filter[0]) as Array<EntityKey<K>>) : undefined;
      if (allKeysArePK(keys, meta.primaryKeys)) {
        // object is PK or PK[]
        return true;
      }
    } else {
      // object
      // {owner: 1, recipient: 2, sex: 0}
      const keys = typeof filter === "object" ? (Object.keys(filter) as Array<EntityKey<K>>) : undefined;
      if (allKeysArePK(keys, meta.primaryKeys)) {
        // object is PK
        return true;
      }
    }
  } else {
    // NOT COMPOSITE
    if (Array.isArray(filter)) {
      // PK[]
      // [1, 2]
      // [{id: 1}, {id: 2}] NOT POSSIBLE FOR NON COMPOSITE
      if (Utils.isPrimaryKey(filter[0])) {
        return true;
      }
    } else {
      // PK or object
      // 1
      // {id: [1, 2], sex: 0} or {id: 1, sex: 0}
      if (Utils.isPrimaryKey(filter)) {
        // PK
        return true;
      }
      const keys =
        typeof filter === "object" ? (Object.keys(filter) as [EntityKey<K>, ...Array<EntityKey<K>>]) : undefined;
      if (keys?.length === 1 && keys[0] === meta.primaryKeys[0]) {
        // object is PK
        return true;
      }
    }
  }
  return false;
}

// Call this fn only if keyProp.targetMeta != null otherwise you will get false positives
// Returns only PKs in short-hand format like 1 or [1, 1] not {id: 1} or {owner: 1, recipient: 2}
function getPKs<K extends object>(
  filter: FilterQueryDataloader<K>,
  meta: EntityMetadata<K>,
): Array<Primary<K>> | undefined {
  if (meta.compositePK) {
    // COMPOSITE
    if (Array.isArray(filter)) {
      // PK or PK[] or object[]
      if (Utils.isPrimaryKey(filter, meta.compositePK)) {
        // PK
        return [filter as Primary<K>];
      }
      if (Utils.isPrimaryKey(filter[0], meta.compositePK)) {
        // PK[]
        return filter as Array<Primary<K>>;
      }
    }
  } else {
    // NOT COMPOSITE
    if (Array.isArray(filter)) {
      // PK[] or object[]
      if (Utils.isPrimaryKey(filter[0])) {
        return filter as Array<Primary<K>>;
      }
    } else {
      // PK or object
      if (Utils.isPrimaryKey(filter)) {
        // PK
        return [filter as Primary<K>];
      }
    }
  }
}

/*
NOT COMPOSITE:                                                                     NEW QUERY                                                      MAP KEY (props in alphabetical order)
  1                                                                             -> {id: [1]}                                                      {id}
  [1, 2]                                                                        -> {id: [1, 2]}                                                   {id}
  {id: 1, sex: 0}                                                               -> {id: [1], sex: [0]}                                            {id,sex}
  {id: [1, 2], sex: 0}                                                          -> {id: [1, 2], sex: [0]}                                         {id,sex}
  [{id: 1}, {id: 2}] NOT POSSIBLE FOR NON COMPOSITE
COMPOSITE PK:
  [1, 2]                                                                        -> {owner: [1], recipient: [2]}                                   {owner,recipient}
  [[1, 2], [3, 4]]                                                              -> {owner: [1, 2], recipient: [3, 4]}                             {owner,recipient}
  {owner: 1, recipient: 2, sex: 0}                                              -> {owner: [1], recipient: [2], sex: [0]}                         {owner,recipient,sex}
  [{owner: 1, recipient: 2}, {owner: 3, recipient: 4}]                          -> {owner: [1, 3], recipient: [2, 4]}                             {owner,recipient}
  [{owner: 1, recipient: 2, sex: 0}, {owner: 3, recipient: 4, sex: 1}] NOT POSSIBLE, MUST MATCH EXACTLY THE PK

  [{owner: [1], recipient: [2], sex: 0}                                         -> {owner: [1], recipient: [2], sex: [0]} // NOT A PK             {owner,recipient,sex}
  [{owner: [1], recipient: [2], sex: 0}, {owner: 3, recipient: 4, sex: 1}]      -> {owner: [1, 3], recipient: [2, 4], sex: [0, 1]} // NOT A PK    {owner,recipient,sex}
*/

const asc = (a: string, b: string): number => a.localeCompare(b);
const notNull = (el: string | undefined): boolean => el != null;

function getNewFiltersAndMapKeys<K extends object>(
  cur: FilterQueryDataloader<K>,
  meta: EntityMetadata<K>,
  entityName: string,
): Array<[FilterQueryDataloader<K>, string]>;
function getNewFiltersAndMapKeys<K extends object>(
  cur: FilterQueryDataloader<K>,
  meta: EntityMetadata<K>,
): [FilterQueryDataloader<K>, string];
function getNewFiltersAndMapKeys<K extends object>(
  cur: FilterQueryDataloader<K>,
  meta: EntityMetadata<K>,
  entityName?: string,
): [FilterQueryDataloader<K>, string] | Array<[FilterQueryDataloader<K>, string]> {
  const PKs = getPKs(cur, meta);
  if (PKs != null) {
    const res: [FilterQueryDataloader<K>, string] = [
      Object.fromEntries(
        meta.primaryKeys.map<[string, any]>((pk, i) => [pk, meta.compositePK ? PKs[i] : PKs]),
      ) as FilterQueryDataloader<K>,
      [entityName, `{${meta.primaryKeys.sort(asc).join(",")}}`].filter(notNull).join("|"),
    ];
    return entityName == null ? res : [res];
  } else {
    const newFilter: any = {};
    const keys: string[] = [];
    if (Array.isArray(cur)) {
      // COMPOSITE PKs like [{owner: 1, recipient: 2}, {recipient: 4, owner: 3}]
      for (const key of meta.primaryKeys) {
        newFilter[key] = cur.map((el: any) => {
          if (el[key] == null) {
            throw new Error(`Invalid query, missing composite PK ${key}`);
          }
          return el[key];
        });
        keys.push(key);
      }
      return [newFilter, `{${keys.sort(asc).join(",")}}`];
    } else {
      for (const [key, value] of Object.entries<any>(cur)) {
        // Using $or at the top level means that we can treat it as two separate queries and filter results from either of them
        if (key === "$or" && entityName != null) {
          return (value as Array<FilterQueryDataloader<K>>)
            .map((el) => getNewFiltersAndMapKeys(el, meta, entityName))
            .flat();
        }
        const keyProp = meta.properties[key as EntityKey<K>];
        if (keyProp == null) {
          throw new Error(`Cannot find properties for ${key}`);
        }
        if (keyProp.targetMeta == null) {
          newFilter[key] = Array.isArray(value) ? value : [value];
          keys.push(key);
        } else {
          const [subFilter, subKey] = getNewFiltersAndMapKeys(value, keyProp.targetMeta);
          newFilter[key] = subFilter;
          keys.push(`${key}:${subKey}`);
        }
      }
      const res: [FilterQueryDataloader<K>, string] = [
        newFilter,
        [entityName, `{${keys.sort(asc).join(",")}}`].filter(notNull).join("|"),
      ];
      return entityName == null ? res : [res];
    }
  }
}

// The purpose of this function on a freshly created query map is just to add populate options
// to the query map. A brand new query map already contains an array with the current element
// as its sole value so there is no need to update it, otherwise we would get the cur element twice.
// TODO: use Sets to avoid duplicates even in subsequent updates.
function updateQueryFilter<K extends object, P extends string = never>(
  [acc, accOptions]: [FilterQueryDataloader<K>, { populate?: true | Set<any> }?],
  cur: FilterQueryDataloader<K>,
  options?: Pick<FindOptions<K, P>, "populate">,
  newQueryMap?: boolean,
): void {
  if (options?.populate != null && accOptions != null && accOptions.populate !== true) {
    if (Array.isArray(options.populate) && options.populate.includes("*")) {
      accOptions.populate = true;
    } else if (Array.isArray(options.populate)) {
      if (accOptions.populate == null) {
        accOptions.populate = new Set(options.populate);
      } else {
        for (const el of options.populate) {
          accOptions.populate.add(el);
        }
      }
    }
  }
  if (newQueryMap !== true) {
    for (const [key, value] of Object.entries(acc)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const curValue = (cur as Record<string, any[]>)[key]!;
      if (Array.isArray(value)) {
        // value.push(...curValue.reduce<any[]>((acc, cur) => acc.concat(cur), []));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        value.push(...structuredClone(curValue));
      } else {
        updateQueryFilter([value], curValue);
      }
    }
  }
}

// The least amount of populate necessary to map the dataloader results to their original queries
function getMandatoryPopulate<K extends object>(
  cur: FilterQueryDataloader<K>,
  meta: EntityMetadata<K>,
): string | undefined;
function getMandatoryPopulate<K extends object>(
  cur: FilterQueryDataloader<K>,
  meta: EntityMetadata<K>,
  options: { populate?: Set<any> },
): void;
function getMandatoryPopulate<K extends object>(
  cur: FilterQueryDataloader<K>,
  meta: EntityMetadata<K>,
  options?: { populate?: Set<any> },
): any {
  for (const [key, value] of Object.entries(cur)) {
    const keyProp = meta.properties[key as EntityKey<K>];
    if (keyProp == null) {
      throw new Error(`Cannot find properties for ${key}`);
    }
    // If our current key leads to scalar we don't need to populate anything
    if (keyProp.targetMeta != null) {
      // Our current key points to either a Reference or a Collection
      // We need to populate all Collections
      // We also need to populate References whenever we have to further match non-PKs properties
      if (keyProp.ref !== true || !isPK(value, keyProp.targetMeta)) {
        const furtherPop = getMandatoryPopulate(value, keyProp.targetMeta);
        const computedPopulate = furtherPop == null ? `${key}` : `${key}.${furtherPop}`;
        if (options != null) {
          if (options.populate == null) {
            options.populate = new Set();
          }
          options.populate.add(computedPopulate);
        } else {
          return computedPopulate;
        }
      }
    }
  }
}

export interface DataloaderFind<K extends object, Hint extends string = never, Fields extends string = never> {
  entityName: string;
  meta: EntityMetadata<K>;
  filter: FilterQueryDataloader<K>;
  options?: Pick<FindOptions<K, Hint, Fields>, "populate">;
  filtersAndKeys: Array<{ key: string; newFilter: FilterQueryDataloader<K> }>;
  many: boolean;
}

export function groupFindQueriesByOpts(
  dataloaderFinds: Array<PartialBy<DataloaderFind<any, any>, "filtersAndKeys">>,
): Map<string, [FilterQueryDataloader<any>, { populate?: true | Set<any> }?]> {
  const queriesMap = new Map<string, [FilterQueryDataloader<any>, { populate?: true | Set<any> }?]>();
  for (const dataloaderFind of dataloaderFinds) {
    const { entityName, meta, filter, options } = dataloaderFind;
    const filtersAndKeys = getNewFiltersAndMapKeys(filter, meta, entityName);
    dataloaderFind.filtersAndKeys = [];
    filtersAndKeys.forEach(([newFilter, key]) => {
      dataloaderFind.filtersAndKeys?.push({ key, newFilter });
      let queryMap = queriesMap.get(key);
      if (queryMap == null) {
        const queryMapOpts = {};
        queryMap = [structuredClone(newFilter), queryMapOpts];
        getMandatoryPopulate(newFilter, meta, queryMapOpts);
        updateQueryFilter(queryMap, newFilter, options, true);
        queriesMap.set(key, queryMap);
      } else {
        updateQueryFilter(queryMap, newFilter, options);
      }
    });
  }
  return queriesMap;
}

export function getFindBatchLoadFn<Entity extends object>(
  em: EntityManager,
  entityName: EntityName<Entity>,
): DataLoader.BatchLoadFn<PartialBy<DataloaderFind<any, any>, "filtersAndKeys">, any> {
  return async (dataloaderFinds: Array<PartialBy<DataloaderFind<any, any>, "filtersAndKeys">>) => {
    const optsMap = groupFindQueriesByOpts(dataloaderFinds);
    assertHasNewFilterAndMapKey(dataloaderFinds);

    const promises = optsMapToQueries(optsMap, em, entityName);
    const resultsMap = new Map(await Promise.all(promises));

    return dataloaderFinds.map(({ filtersAndKeys, many }) => {
      const res = filtersAndKeys.reduce<any[]>((acc, { key, newFilter }) => {
        const entities = resultsMap.get(key);
        if (entities == null) {
          // Should never happen
          /* istanbul ignore next */
          throw new Error("Cannot match results");
        }
        const res = entities[many ? "filter" : "find"]((entity) => {
          return filterResult(entity, newFilter);
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        acc.push(...(Array.isArray(res) ? res : [res]));
        return acc;
      }, []);
      return many ? res : res[0] ?? null;
    });

    function filterResult<K extends object>(entity: K, filter: FilterQueryDataloader<K>): boolean {
      for (const [key, value] of Object.entries(filter)) {
        const entityValue = entity[key as keyof K];
        if (Array.isArray(value)) {
          // Our current filter is an array
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
          // Our current filter is an object
          if (entityValue instanceof Collection) {
            if (!entityValue.getItems().some((entity) => filterResult(entity, value))) {
              return false;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          } else if (!filterResult(entityValue as object, value)) {
            return false;
          }
        }
      }
      return true;
    }
  };
}

export function optsMapToQueries<Entity extends object>(
  optsMap: Map<string, [FilterQueryDataloader<any>, { populate?: true | Set<any> }?]>,
  em: EntityManager,
  entityName: EntityName<Entity>,
): Array<Promise<[string, any[]]>> {
  return Array.from(optsMap, async ([key, [filter, options]]): Promise<[string, any[]]> => {
    const findOptions = {
      ...(options?.populate != null && {
        populate: options.populate === true ? ["*"] : Array.from(options.populate),
      }),
    } satisfies Pick<FindOptions<any, any>, "populate">;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const entities = await em.find(entityName, filter, findOptions);
    return [key, entities];
  });
}

export function assertHasNewFilterAndMapKey(
  dataloaderFinds: Array<PartialBy<DataloaderFind<any, any>, "filtersAndKeys">>,
): asserts dataloaderFinds is Array<DataloaderFind<any, any>> {
  /* if (dataloaderFinds.some((el) => el.key == null || el.newFilter == null)) {
    throw new Error("Missing key or newFilter");
  } */
}

export function hasRef<T extends AnyEntity<T>>(entity: T): T & Record<string, Reference<T>> {
  return entity as T & Record<string, Reference<T>>;
}

export function hasCol<T extends AnyEntity<T>, K extends object>(entity: T): T & Record<string, Collection<T, K>> {
  return entity as T & Record<string, Collection<T, K>>;
}

export function isRef<T extends AnyEntity<T>, K extends object>(
  refOrCol: Reference<T> | Collection<T, K>,
): refOrCol is Reference<T> {
  return !(refOrCol instanceof Collection);
}

export function isCol<T extends AnyEntity<T>, K extends object>(
  refOrCol: Reference<T> | Collection<T, K>,
): refOrCol is Collection<T, K> {
  return refOrCol instanceof Collection;
}
