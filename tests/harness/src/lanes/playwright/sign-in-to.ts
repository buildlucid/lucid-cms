import type { BrowserContext } from "@playwright/test";
import type { Session } from "../../client/types.ts";

/**
 * Signs a browser in to a server other than the one the lane started, such as one from
 * `migrations.serve()`, as that server's admin.
 */
const signInTo = async (
	context: BrowserContext,
	server: { url: string; admin: Session },
) => {
	await context.clearCookies();
	await context.addCookies(
		server.admin.cookies().map((cookie) => ({
			...cookie,
			domain: new URL(server.url).hostname,
			path: "/",
		})),
	);
};

export default signInTo;
