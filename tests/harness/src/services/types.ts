/** Something the harness runs in Docker for setups to use, such as a database server. */
export type Service = {
	/** Its name in `docker-compose.yml`. */
	name: string;
	/**
	 * The variables that say where it is, with the addresses of the Docker one.
	 * Set them yourself to use a server that is already running somewhere else.
	 */
	env: Record<string, string>;
	/** An address that answers once it is ready, for services Docker cannot health check. */
	healthUrl?: string;
};
