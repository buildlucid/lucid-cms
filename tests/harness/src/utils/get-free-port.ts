import { createServer } from "node:net";

/** Asks the system for a port nothing is listening on. */
const getFreePort = (): Promise<number> =>
	new Promise((resolve, reject) => {
		const server = createServer();
		server.unref();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			server.close(() => {
				if (address && typeof address === "object") {
					resolve(address.port);
				} else {
					reject(new Error("Could not find a free port."));
				}
			});
		});
	});

export default getFreePort;
