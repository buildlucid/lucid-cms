import { LucidError } from "../../utils/errors/index.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import type {
	DatabaseAdapterCreator,
	DatabaseAdapterFactory,
} from "../db/adapter-factory.js";
import type { DatabaseAdapterValue, EnvironmentVariables } from "./types.js";

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
	return (
		(typeof value === "object" || typeof value === "function") &&
		value !== null &&
		"then" in value
	);
};

const isDatabaseAdapter = (value: unknown): value is DatabaseAdapter => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const adapter = value as Partial<DatabaseAdapter>;

	return (
		typeof adapter.adapter === "string" &&
		typeof adapter.initialize === "function" &&
		typeof adapter.inferSchema === "function" &&
		typeof adapter.dropAllTables === "function"
	);
};

const isDatabaseAdapterFactory = (
	value: unknown,
): value is DatabaseAdapterFactory => {
	if (!value || (typeof value !== "object" && typeof value !== "function")) {
		return false;
	}

	const factory = value as Partial<DatabaseAdapterFactory> &
		Partial<DatabaseAdapterCreator>;

	if (
		typeof value === "function" &&
		factory.__lucidDatabaseAdapterCreator !== true
	) {
		return false;
	}

	return (
		typeof factory.adapter === "string" && typeof factory.resolve === "function"
	);
};

export const resolveDatabaseAdapter = async (
	db: DatabaseAdapterValue,
	env: EnvironmentVariables | undefined,
): Promise<DatabaseAdapter> => {
	const resolvedValue = isPromiseLike(db) ? await db : db;
	const maybeAdapter = isDatabaseAdapterFactory(resolvedValue)
		? resolvedValue.resolve(env ?? {})
		: resolvedValue;
	const adapter = isPromiseLike(maybeAdapter)
		? await maybeAdapter
		: maybeAdapter;

	if (!isDatabaseAdapter(adapter)) {
		throw new LucidError({
			message:
				"Lucid could not resolve the configured database adapter. Pass a database adapter instance or adapter-level env factory to `configureLucid({ db })`, such as `db: libsql((env) => ({ ... }))`. Top-level `db: (env) => ...` callbacks are not supported.",
		});
	}

	return adapter;
};

export default resolveDatabaseAdapter;
