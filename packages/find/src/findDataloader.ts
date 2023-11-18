import {
  Collection,
  type FindOptions,
  Utils,
  type AnyEntity,
  type Reference,
  type Primary,
  type EntityMetadata,
  helper,
  type EntityKey,
} from "@mikro-orm/core";
import { type FilterQueryDataloader } from "./EntityDataLoader";
import { type PartialBy } from "./types";

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

// Call this fn only if keyProp.targetMeta != null otherwise you will get false positives
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

function updateQueryFilter<K extends object, P extends string = never>(
  [acc, accOptions]: [FilterQueryDataloader<K>, { populate?: true | Set<any> }?],
  cur: FilterQueryDataloader<K>,
  options?: Pick<FindOptions<K, P>, "populate">,
): void {
  if (options?.populate != null && accOptions != null && accOptions.populate !== true) {
    if (Array.isArray(options.populate) && options.populate[0] === "*") {
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
  for (const [key, value] of Object.entries(acc)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const curValue = (cur as Record<string, any[]>)[key]!;
    if (Array.isArray(value)) {
      value.push(...curValue.reduce<any[]>((acc, cur) => acc.concat(cur), []));
    } else {
      updateQueryFilter([value], curValue);
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

export function groupFindQueries(
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
        queryMap = [structuredClone(newFilter), {}];
        updateQueryFilter(queryMap, newFilter);
        queriesMap.set(key, queryMap);
      } else {
        updateQueryFilter(queryMap, newFilter, options);
      }
    });
  }
  return queriesMap;
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
