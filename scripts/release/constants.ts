/** The package every other package's version follows. */
export const LEAD_PACKAGE = "@lucidcms/core";

/** Workspace folders whose packages are published together and share the lead package's version. */
export const VERSIONED_FOLDERS = ["packages"];

/** Folders that only depend on Lucid packages. Their own versions are left alone. */
export const DEPENDENT_FOLDERS = ["apps", "templates"];

export const DEPENDENCY_FIELDS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

/** A range the workspace resolves by itself, which playgrounds use. It is never rewritten. */
export const ANY_VERSION = "*";
