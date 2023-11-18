<h1 align="center">
  Additional dataloders for MikroORM
</h1>

<br>

The n+1 problem is when multiple types of data are requested in one query, but where n requests are required instead of just one. This is typically encountered when data is nested, such as if you were requesting authors and the name of their books. It is an inherent problem of GraphQL APIs and can be solved by batching multiple requests into a single one. This can be automated via the dataloader library which will coalesce all individual loads which occur within a single frame of execution (a single tick of the event loop) and then call your batch function with all requested keys. That means writing a batch loading function for each and every db call which aggregates multiple queries into a single one, plus filtering the results to reassign them to the original queries. Fortunately MikroORM has plently of metadata to trasparently automate this process so that you won't have to write your own batch loading functions.

In the current version of MikroORM I already upstreamed two dataloaders capable of dataloging references and collections, but this suite of packages aims to provide additional dataloaders for MikroORM that have not been upstreamed yet/are not planned to be upstreamed.

## Dataloaders

- The `find` dataloader takes care of batching whole find queries with a subset of the operators supported.

## Usage

```
yarn install mikro-orm-find-dataloader
```

Look at the [examples](https://github.com/darkbasic/mikro-orm-dataloaders/tree/main/examples) for further usage instructions.
