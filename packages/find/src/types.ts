/* eslint-disable @typescript-eslint/dot-notation */
import { type EntityName, type EntityRepository } from "@mikro-orm/core";

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export function isRepo<K extends object>(
  repoOrClass: EntityRepository<K> | EntityName<K>,
): repoOrClass is EntityRepository<K> {
  return typeof (repoOrClass as EntityRepository<K>)["getEntityManager"] === "function";
}
