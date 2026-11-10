import type { CapabilityChanges } from "../capabilities/types.ts";
import type { JsonObject } from "../utils/json.ts";

/** The databases a setup can ask for. */
export type DatabaseKey = "sqlite" | "libsql" | "postgres";

/** Where a driver may keep a database's files, and the name to give it. */
export type DatabaseLocation = {
	directory: string;
	/** Unique within a run, and safe to use in file and database names. */
	name: string;
};

/** A database that is ready for a setup to connect to. */
export type ProvisionedDatabase = {
	/** The value the setup's config receives as `HARNESS_DATABASE_URL`. */
	url: string;
	destroy(): Promise<void>;
};

/**
 * A finished template, which holds the migrated schema and seed data.
 * It is plain data, so the runner can hand it to test workers in other processes.
 */
export type DatabaseTemplate = {
	driver: string;
	state: JsonObject;
};

/**
 * Provides databases for one engine. Migrations run once into a template, then every test
 * file or server gets its own cheap copy.
 */
export type DatabaseDriver<State extends JsonObject = JsonObject> = {
	key: string;
	/** What this engine adds to, or takes away from, a setup's capabilities. */
	capabilities: CapabilityChanges;
	/**
	 * Creates an empty database to migrate and seed. `seal` then freezes it as the template, or
	 * `discard` throws it away when preparing it failed.
	 */
	createTemplate(location: DatabaseLocation): Promise<{
		url: string;
		seal(): Promise<State>;
		discard(): Promise<void>;
	}>;
	/** Copies a template into a fresh database. Any process may call this. */
	clone(state: State, location: DatabaseLocation): Promise<ProvisionedDatabase>;
	destroyTemplate(state: State): Promise<void>;
};
