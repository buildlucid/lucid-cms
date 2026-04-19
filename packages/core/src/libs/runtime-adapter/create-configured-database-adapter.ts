import { LucidError } from "../../utils/errors/index.js";
import type {
	DatabaseAdapterClass,
	EnvironmentVariables,
	LazyDatabaseAdapterReference,
} from "./types.js";

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
	return (
		(typeof value === "object" || typeof value === "function") &&
		value !== null &&
		"then" in value
	);
};

const resolveDatabaseAdapterOptions = <DatabaseModule extends string>(
	database: LazyDatabaseAdapterReference<DatabaseModule>,
	env: EnvironmentVariables | undefined,
): Record<string, unknown> | undefined => {
	const options = database.options;

	if (typeof options !== "function") {
		return options as Record<string, unknown> | undefined;
	}

	const resolvedOptions = options(env ?? {});

	if (isPromiseLike(resolvedOptions)) {
		throw new LucidError({
			message: `Lucid database options for "${database.module}" must be a plain object or a synchronous function.`,
		});
	}

	return resolvedOptions as Record<string, unknown> | undefined;
};

export const createConfiguredDatabaseAdapter = <DatabaseModule extends string>(
	DatabaseAdapterCtor: DatabaseAdapterClass,
	database: LazyDatabaseAdapterReference<DatabaseModule>,
	env: EnvironmentVariables | undefined,
) => {
	if (typeof DatabaseAdapterCtor !== "function") {
		throw new LucidError({
			message: "Lucid could not instantiate the configured database adapter.",
		});
	}

	const options = resolveDatabaseAdapterOptions(database, env);

	return new DatabaseAdapterCtor(options);
};

export default createConfiguredDatabaseAdapter;
