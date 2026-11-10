import { LIBSQL_ADMIN_URL_ENV, LIBSQL_URL_ENV } from "../services/services.ts";
import defineDriver from "./define-driver.ts";

type LibsqlState = { namespace: string };

const getEnv = (name: string): string => {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`${name} is not set. libSQL setups need the libsql service from docker-compose.yml, which the harness starts when Docker is running.`,
		);
	}
	return value;
};

/** Calls the server's admin API, which creates, copies and deletes namespaces. */
const admin = async (
	method: "POST" | "DELETE",
	path: string,
): Promise<void> => {
	const response = await fetch(new URL(path, getEnv(LIBSQL_ADMIN_URL_ENV)), {
		method,
		headers: { "content-type": "application/json" },
		body: method === "POST" ? "{}" : undefined,
	});
	if (!response.ok) {
		throw new Error(
			`libSQL admin ${method} ${path} failed with ${response.status}: ${await response.text()}`,
		);
	}
};

/** Namespaces are chosen by subdomain, so their names must be valid in a host name. */
const toNamespace = (name: string): string =>
	name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");

/** The server picks the namespace from the first label of the host, such as `name.localhost`. */
const urlFor = (namespace: string): string => {
	const url = new URL(getEnv(LIBSQL_URL_ENV));
	url.hostname = `${namespace}.${url.hostname}`;
	return url.href;
};

/**
 * A real libSQL server, reached over HTTP as the adapter does in production.
 * Each database is a namespace, and a copy is a fork of the template's namespace.
 */
const libsqlDriver = defineDriver<LibsqlState>({
	key: "libsql",
	capabilities: {},
	createTemplate: async (location) => {
		const namespace = toNamespace(location.name);
		await admin("POST", `/v1/namespaces/${namespace}/create`);

		return {
			url: urlFor(namespace),
			seal: async () => ({ namespace }),
			discard: () => admin("DELETE", `/v1/namespaces/${namespace}`),
		};
	},
	clone: async (state, location) => {
		const namespace = toNamespace(location.name);
		await admin("POST", `/v1/namespaces/${state.namespace}/fork/${namespace}`);

		return {
			url: urlFor(namespace),
			destroy: () => admin("DELETE", `/v1/namespaces/${namespace}`),
		};
	},
	destroyTemplate: (state) =>
		admin("DELETE", `/v1/namespaces/${state.namespace}`),
});

export default libsqlDriver;
