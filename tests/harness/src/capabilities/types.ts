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
	/** The queue adapter jobs run through, such as `queue:inline` or `queue:worker`. */
	| `queue:${string}`
	/** A queue behaviour, such as `queue.delayedDelivery` for jobs that run at a later time. */
	| `queue.${string}`
	| `collection:${string}`
	| `locale:${string}`
	| `auth:${string}`
	| `feature:${string}`
	/** Something the harness adds to a setup for tests, such as `harness:outbox` for sent emails. */
	| `harness:${string}`;

/** Capabilities to add to, or take away from, what the harness worked out by itself. */
export type CapabilityChanges = {
	add?: readonly Capability[];
	remove?: readonly Capability[];
};
