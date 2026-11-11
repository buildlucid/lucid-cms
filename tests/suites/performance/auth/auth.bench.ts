import { randomUUID } from "node:crypto";
import path from "node:path";
import {
	ADMIN,
	benchmark,
	measureRequests,
	runMeasured,
	type ServedCms,
} from "#harness/performance";

/** Logins take a password hash each, so fewer are timed than other requests. */
const LOGINS = 10;
/** Refreshes share the sign-in routes' limit of ten a minute per address, which KV setups enforce. */
const REFRESHES = 8;
const REQUESTS = 40;
/** Logins for accounts that don't exist, sent at once while signed-in requests are timed. */
const FLOOD = 16;

const login = (session: ReturnType<ServedCms["session"]>) =>
	session.request({
		method: "POST",
		path: "/api/v1/auth/login",
		body: { usernameOrEmail: ADMIN.username, password: ADMIN.password },
	});

/**
 * Measures sign-in, refresh and authenticated requests on the built server, including requests
 * during a flood of unknown-account logins to detect hashing contention.
 */
benchmark<ServedCms>({
	id: "auth",
	warmups: 0,
	prepare: async (context) => {
		const database = await context.database();
		await runMeasured({
			command: "lucidcms",
			args: ["migrate", "--yes"],
			cwd: context.setup.directory,
			env: { ...context.env, HARNESS_DATABASE_URL: database.url },
			log: path.join(context.work, "auth-migrate.log"),
		});
		const server = await context.serve(database);
		//* the first requests load code the timed ones would otherwise wait for
		for (let warmup = 0; warmup < 3; warmup++) {
			await login(server.session());
			await server.admin.request({ path: "/api/v1/account" });
		}
		return {
			...server,
			stop: async () => {
				await server.stop();
				await database.destroy();
			},
		};
	},
	cleanup: (server) => server.stop(),
	sample: async (_context, server) => {
		const refreshing = server.session();
		await login(refreshing);

		const quiet = {
			...(await measureRequests({
				key: "login",
				label: "Logging in with a password",
				status: 200,
				requests: LOGINS,
				send: () => login(server.session()),
			})),
			...(await measureRequests({
				key: "refresh",
				label: "Refreshing a session",
				status: 204,
				requests: REFRESHES,
				send: () =>
					refreshing.request({ method: "POST", path: "/api/v1/auth/token" }),
			})),
			...(await measureRequests({
				key: "signed-in",
				label: "A signed-in request",
				status: 200,
				requests: REQUESTS,
				send: () => server.admin.request({ path: "/api/v1/account" }),
			})),
		};

		let flooding = true;
		const flood = Array.from({ length: FLOOD }, async () => {
			while (flooding) {
				await server.session().request({
					method: "POST",
					path: "/api/v1/auth/login",
					body: { usernameOrEmail: `nobody-${randomUUID()}`, password: "x" },
				});
			}
		});
		try {
			return {
				...quiet,
				...(await measureRequests({
					key: "signed-in.flooded",
					label: "A signed-in request during a flood of logins",
					status: 200,
					requests: REQUESTS,
					send: () => server.admin.request({ path: "/api/v1/account" }),
				})),
			};
		} finally {
			flooding = false;
			await Promise.all(flood);
		}
	},
});
