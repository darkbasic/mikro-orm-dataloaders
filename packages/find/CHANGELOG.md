# mikro-orm-find-dataloader

## 2.1.0

### Minor Changes

- [#11](https://github.com/darkbasic/mikro-orm-dataloaders/pull/11) [`e69b274`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/e69b27449d95ec4edd1d3e2eccc8b18c0d3316e4) Thanks [@darkbasic](https://github.com/darkbasic)! - perf: run mandatory populate logic once per querymap

- [#11](https://github.com/darkbasic/mikro-orm-dataloaders/pull/11) [`2ac3bc0`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/2ac3bc06347c7314930c5bee6549db054ce0fe74) Thanks [@darkbasic](https://github.com/darkbasic)! - fix: filter collections when reassigning results

- [#11](https://github.com/darkbasic/mikro-orm-dataloaders/pull/11) [`5e17832`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/5e178321bd951c4399a06ab2dfe0d956f12bd75e) Thanks [@darkbasic](https://github.com/darkbasic)! - fix: compute mandatory populates even if not efficiently

### Patch Changes

- [#11](https://github.com/darkbasic/mikro-orm-dataloaders/pull/11) [`ee1cafa`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/ee1cafad5898b17eeabad8731395667abcadbba2) Thanks [@darkbasic](https://github.com/darkbasic)! - Fix vscode test runner

## 2.0.1

### Patch Changes

- [#9](https://github.com/darkbasic/mikro-orm-dataloaders/pull/9) [`a904df2`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/a904df20f256f25064d4c1ce482be54bad10fcdd) Thanks [@darkbasic](https://github.com/darkbasic)! - Make sure we always add populate options to the queryMap

## 2.0.0

### Major Changes

- [#7](https://github.com/darkbasic/mikro-orm-dataloaders/pull/7) [`137d5df`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/137d5dfed079ab6676f7915ea28cc76ca2c0775c) Thanks [@darkbasic](https://github.com/darkbasic)! - Switch to Repository API

## 1.2.0

### Minor Changes

- [#5](https://github.com/darkbasic/mikro-orm-dataloaders/pull/5) [`2da3750`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/2da37501acfb05ee962f286fd6ed794af87e7999) Thanks [@darkbasic](https://github.com/darkbasic)! - Remove unnecessary deps and update them

### Patch Changes

- [#5](https://github.com/darkbasic/mikro-orm-dataloaders/pull/5) [`2da3750`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/2da37501acfb05ee962f286fd6ed794af87e7999) Thanks [@darkbasic](https://github.com/darkbasic)! - dependencies updates:
  - Added dependency [`tslib@2.6.2` ↗︎](https://www.npmjs.com/package/tslib/v/2.6.2) (to `dependencies`)
  - Removed dependency [`@graphql-tools/executor-http@^1.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor-http/v/1.0.3) (from `dependencies`)
  - Removed dependency [`graphql-tag@^2.12.6` ↗︎](https://www.npmjs.com/package/graphql-tag/v/2.12.6) (from `dependencies`)

## 1.1.0

### Minor Changes

- [#3](https://github.com/darkbasic/mikro-orm-dataloaders/pull/3) [`4ce7f14`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/4ce7f14f0c6ce8b86146c950829ea7d6e79992c6) Thanks [@darkbasic](https://github.com/darkbasic)! - Ensure computed queries get processed in parallel

## 1.0.1

### Patch Changes

- [#1](https://github.com/darkbasic/mikro-orm-dataloaders/pull/1) [`a1a0fff`](https://github.com/darkbasic/mikro-orm-dataloaders/commit/a1a0fff0a7c2ea814ec687027d42e8aa2ca04f47) Thanks [@darkbasic](https://github.com/darkbasic)! - Compatibility with latest MikroORM alphas which export different types
