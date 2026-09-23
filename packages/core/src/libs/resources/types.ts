export const resourceKinds = [
	"migrations",
	"seeds",
	"translations",
	"templates",
	"public",
] as const;

export type ResourceKind = (typeof resourceKinds)[number];

/** Project directories relative to lucid.config. Set a resource to false to disable its directory. */
export type ResourceDirectories = Partial<Record<ResourceKind, string | false>>;

/** A file, directory, exported package subpath, or file URL containing resources. */
export type ResourceSource = string | URL;

/** Additional resource locations, independent of project directories. Later asset sources override earlier ones. */
export type ResourceSources = Partial<
	Record<Exclude<ResourceKind, "public">, ResourceSource[]>
> & {
	/** Public files or directories. For a directory, output is its public URL prefix. For a file, output is its exact public path. */
	public?: (ResourceSource | { input: ResourceSource; output: string })[];
};

export type ResourceFile = { path: string; name: string };
export type ResourceFiles = Record<ResourceKind, ResourceFile[]>;

/** Build inputs collected while loading the project configuration. */
export type PreparedResources = {
	files: ResourceFiles;
	watch: string[];
};
