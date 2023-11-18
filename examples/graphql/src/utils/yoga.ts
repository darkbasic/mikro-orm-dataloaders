import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { type YogaServerInstance } from "graphql-yoga";
import { type DocumentNode, type ExecutionResult } from "graphql";

export function assertSingleValue<TValue extends object>(
  value: TValue | AsyncIterable<TValue>,
): asserts value is TValue {
  if (Symbol.asyncIterator in value) {
    throw new Error("Expected single value");
  }
}

type MaybeAsyncIterable<T> = AsyncIterable<T> | T;

export async function executeOperation(
  yoga: YogaServerInstance<any, any>,
  document: DocumentNode,
): Promise<MaybeAsyncIterable<ExecutionResult<any, any>>> {
  const executor = buildHTTPExecutor({
    // eslint-disable-next-line @typescript-eslint/unbound-method
    fetch: yoga.fetch,
  });

  return await executor({
    document,
  });
}
