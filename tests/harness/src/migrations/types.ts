import type { InferredTable, KyselyDB } from "@lucidcms/core/types";
import type { GeneratedStep } from "../../../shared/migrations/collections/generated.ts";
import type { SchemaStepKey } from "../../../shared/migrations/steps.ts";
import type { Session } from "../client/types.ts";

/** A registered or generated schema step, or null for the setup's config as it is. */
export type Step = SchemaStepKey | GeneratedStep | null;

/** How a `lucidcms` command ended. */
export type CliRun = {
	code: number;
	/** Everything it printed, without colour codes. */
	output: string;
};

/**
 * One database a migration test owns. It starts empty, so the test decides every migration it
 * gets. Each call loads the setup's config at the step it names.
 */
export type MigrationDatabase = {
	/** What the setup's config receives as `HARNESS_DATABASE_URL`. */
	url: string;
	/**
	 * Runs a `lucidcms` command as a project would, with no terminal to answer prompts.
	 *
	 * @example
	 * ```ts
	 * const run = await database.cli("article/added", "migrate", "--yes");
	 * expect(run.code).toBe(0);
	 * ```
	 */
	cli(step: Step, ...args: string[]): Promise<CliRun>;
	/**
	 * Starts the CMS on the database in a process of its own for as long as `use` takes, signed in
	 * as the admin. Each call is a newly started server. `server` makes visitors to it, and its
	 * `url` is the address the CMS believes it is served from, which passkeys are made for.
	 */
	cms<Result>(
		step: Step,
		use: (
			admin: Session,
			server: { url: string; session(): Session },
		) => Promise<Result>,
	): Promise<Result>;
	/**
	 * Reads the tables, columns and indexes the database has now, as the setup's adapter reports
	 * them and sorted by name. Adapters may leave out tables that are not Lucid's.
	 */
	schema(): Promise<InferredTable[]>;
	/** Runs queries straight on the database, for what the API cannot show or set up. */
	query<Result>(use: (kysely: KyselyDB) => Promise<Result>): Promise<Result>;
};

/** Brings a new database to the state tests start from, such as migrated with content in it. */
export type PrepareDatabase = (database: MigrationDatabase) => Promise<void>;

/** What the `migrations` fixture gives a test. */
export type Migrations = {
	/**
	 * Creates a database, which is removed when the test ends. It starts empty, or as `prepare`
	 * left it. `prepare` runs at most once per test file and every call gets its own copy, so tests
	 * that start from the same state skip repeating it. See `migratedTo`.
	 */
	database(prepare?: PrepareDatabase): Promise<MigrationDatabase>;
};
