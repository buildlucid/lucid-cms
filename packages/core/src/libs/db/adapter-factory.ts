import type { EnvironmentVariables } from "../runtime/types.js";
import type DatabaseAdapter from "./adapter-base.js";

export type DatabaseAdapterOptionsFactory<TOptions> = (
	env: EnvironmentVariables,
) => TOptions | Promise<TOptions>;

export type DatabaseAdapterFactory<
	TAdapter extends DatabaseAdapter = DatabaseAdapter,
> = {
	adapter: string;
	resolve: (env: EnvironmentVariables) => TAdapter | Promise<TAdapter>;
};

export type DatabaseAdapterCreator<
	TAdapter extends DatabaseAdapter = DatabaseAdapter,
> = DatabaseAdapterFactory<TAdapter> & {
	__lucidDatabaseAdapterCreator: true;
};

export const createDatabaseAdapterFactory = <
	TAdapter extends DatabaseAdapter = DatabaseAdapter,
>(props: {
	adapter: string;
	resolve: (env: EnvironmentVariables) => TAdapter | Promise<TAdapter>;
}): DatabaseAdapterFactory<TAdapter> => ({
	adapter: props.adapter,
	resolve: props.resolve,
});

export const createDatabaseAdapterCreator = <
	// biome-ignore lint/suspicious/noExplicitAny: preserves overloaded adapter creator signatures
	TCreator extends (...args: any[]) => unknown,
	TAdapter extends DatabaseAdapter = DatabaseAdapter,
>(
	creator: TCreator,
	props: {
		adapter: string;
		resolve: (env: EnvironmentVariables) => TAdapter | Promise<TAdapter>;
	},
): TCreator & DatabaseAdapterCreator<TAdapter> =>
	Object.assign(creator, {
		adapter: props.adapter,
		resolve: props.resolve,
		__lucidDatabaseAdapterCreator: true as const,
	});
