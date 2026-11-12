import { createServer } from "node:net";

/** Ports below every system's ephemeral range (from 32768 on Linux and 49152 on macOS). */
const RANGE = { first: 20_000, last: 32_000 } as const;

const ATTEMPTS = 50;

/**
 * Finds an unused port outside the ephemeral range, avoiding outgoing connections that reuse the
 * port and accidentally connect to themselves.
 */
const getFreePort = async (): Promise<number> => {
	const isFree = (port: number) =>
		new Promise<boolean>((resolve) => {
			const server = createServer();
			server.unref();
			server.once("error", () => resolve(false));
			server.listen(port, "127.0.0.1", () => {
				server.close(() => resolve(true));
			});
		});

	for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
		const port =
			RANGE.first + Math.floor(Math.random() * (RANGE.last - RANGE.first + 1));
		if (await isFree(port)) {
			return port;
		}
	}
	throw new Error(
		`Could not find a free port between ${RANGE.first} and ${RANGE.last}.`,
	);
};

export default getFreePort;
