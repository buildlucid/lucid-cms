import type { Mode } from "../setup/types.ts";

/**
 * Something a setup can do, which tests name in `requires()`.
 * Most are read from the setup's config, so a new plugin or option shows up without extra work.
 */
export type Capability =
	| `mode:${Mode}`
	| `runtime:${string}`
	/** The database adapter, such as `database:postgres`. */
	| `database:${string}`
	/** A database behaviour, such as `database.sharedRowLocks` or `database.concurrentWrites`. */
	| `database.${string}`
	| `plugin:${string}`
	| `collection:${string}`
	| `locale:${string}`
	| `auth:${string}`
	| `feature:${string}`;

/** Capabilities to add to, or take away from, what the harness worked out by itself. */
export type CapabilityChanges = {
	add?: readonly Capability[];
	remove?: readonly Capability[];
};
