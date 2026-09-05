import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { TableDefinition } from "../db/client/table/definition.js";
import type { AllHooks } from "../hooks/types.js";
import type { LucidCustomRouteDefinition } from "../http/types.js";
import type { AnyJobDefinition } from "../jobs/types.js";

export const resourceKinds = [
	"collections",
	"tables",
	"routes",
	"hooks",
	"jobs",
	"migrations",
	"seeds",
	"translations",
	"templates",
	"public",
] as const;

export type ResourceKind = (typeof resourceKinds)[number];

/** Project directories to discover, relative to lucid.config. Set a resource to false to register it manually. */
export type ResourceDiscovery = Partial<Record<ResourceKind, string | false>>;

/** A file, directory, exported package subpath, or file URL containing resources. */
export type ResourceSource = string | URL;

/** Additional resource locations, independent of project-directory discovery. Later asset sources override earlier ones. */
export type ResourceSources = Partial<
	Record<Exclude<ResourceKind, "public">, ResourceSource[]>
> & {
	/** Public files or directories. For a directory, output is its public URL prefix. For a file, output is its exact public path. */
	public?: (ResourceSource | { input: ResourceSource; output: string })[];
};

export type ResourceModules = {
	collections: CollectionBuilder[];
	tables: TableDefinition[];
	routes: LucidCustomRouteDefinition[];
	hooks: AllHooks[];
	jobs: AnyJobDefinition[];
};

export type ResourceModuleKind = keyof ResourceModules;
export type ResourceModuleFiles = Record<ResourceModuleKind, string[]>;
export type ResourceFile = { path: string; name: string };
export type ResourceFiles = Record<ResourceKind, ResourceFile[]>;

/** Build inputs collected while loading the project configuration. */
export type PreparedResources = {
	modules: ResourceModuleFiles;
	files: ResourceFiles;
	watch: string[];
	dependencies: string[];
};
