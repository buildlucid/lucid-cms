/** A published npm package and its installed version, usually read from the package's own `package.json`. */
export type PackageInfo = {
	/** The npm package name, such as `@acme/lucid-seo`. */
	name: string;
	/** The installed version, such as `1.2.0`. */
	version: string;
};

/** A package's `latest` version on npm. */
export type LatestPackage = {
	version: string;
	/** The `@lucidcms/core` range from that version's `peerDependencies`, or null when it doesn't name one. */
	requiresCore: string | null;
};
