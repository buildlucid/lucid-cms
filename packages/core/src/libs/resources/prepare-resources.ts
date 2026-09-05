import type { Jiti } from "jiti";
import type { LucidConfig } from "../../types/config.js";
import withConfigLoader from "../config/utils/with-config-loader.js";
import { getRouteKey, getRoutePath } from "../http/utils/route-identity.js";
import collectSources from "./collect-sources.js";
import { emptyResourceFiles } from "./defaults.js";
import loadModules from "./load-modules.js";
import {
	collectionSchema,
	hookSchema,
	jobSchema,
	routeSchema,
	tableSchema,
} from "./module-schemas.js";
import { registerResourceModules } from "./register-modules.js";
import type { PreparedResources } from "./types.js";

export const emptyPreparedResources = (): PreparedResources => ({
	modules: { collections: [], tables: [], routes: [], hooks: [], jobs: [] },
	files: emptyResourceFiles(),
	watch: [],
	dependencies: [],
});

const unwrap = <T>(result: PromiseSettledResult<T>): T => {
	if (result.status === "rejected") throw result.reason;
	return result.value;
};

/** Resolves project resources and registers definitions for compilation and command-time loading. */
export const prepareResources = async (
	config: LucidConfig,
	projectRoot: string,
	loader?: Jiti,
): Promise<{ config: LucidConfig; resources: PreparedResources }> => {
	if (!loader)
		return withConfigLoader(
			(jiti) => prepareResources(config, projectRoot, jiti),
			projectRoot,
		);
	const { files, watch } = await collectSources(config, projectRoot, loader);

	const results = await Promise.allSettled([
		loadModules({
			loader,
			kind: "collections",
			files: files.collections,
			schema: collectionSchema,
			key: (value) => value.key,
			explicit: config.collections,
		}),
		loadModules({
			loader,
			kind: "tables",
			files: files.tables,
			schema: tableSchema,
			key: (value) => value.name,
			explicit: config.tables,
		}),
		loadModules({
			loader,
			kind: "routes",
			files: files.routes,
			schema: routeSchema,
			key: (value) =>
				getRouteKey({ method: value.method, path: getRoutePath(value) }),
			explicit: config.http?.routes,
		}),
		loadModules({
			loader,
			kind: "hooks",
			files: files.hooks,
			schema: hookSchema,
		}),
		loadModules({
			loader,
			kind: "jobs",
			files: files.jobs,
			schema: jobSchema,
			key: (value) => `${value.name}@${value.version}`,
			explicit: config.jobs?.definitions,
		}),
	]);

	const collections = unwrap(results[0]);
	const tables = unwrap(results[1]);
	const routes = unwrap(results[2]);
	const hooks = unwrap(results[3]);
	const jobs = unwrap(results[4]);

	const dependencies = [
		...new Set(
			[collections, tables, routes, hooks, jobs].flatMap(
				(result) => result.dependencies,
			),
		),
	].sort();

	return {
		config: registerResourceModules(config, {
			collections: collections.values,
			tables: tables.values,
			routes: routes.values,
			hooks: hooks.values,
			jobs: jobs.values,
		}),
		resources: {
			files,
			modules: {
				collections: collections.files,
				tables: tables.files,
				routes: routes.files,
				hooks: hooks.files,
				jobs: jobs.files,
			},
			watch: [...new Set([...watch, ...dependencies])].sort(),
			dependencies,
		},
	};
};
