import type { ConnectionStatus } from "@lucidcms/core/types";
import type { Session } from "../../client/types.ts";
import { AUTHORIZE_PARAMS } from "./oauth.ts";

/** The CMS's connection to Lucid, as the admin sees it. */
export const connectionStatus = async (
	session: Session,
): Promise<ConnectionStatus> => {
	const status = await session.request<{ data: ConnectionStatus }>({
		path: "/api/v1/connection/status",
	});
	if (!status.ok) {
		throw new Error(`Connection status answered ${status.status}.`);
	}
	return status.body.data;
};

/**
 * Completes the admin connection flow and returns the CMS redirect, including `result` and
 * `error`. `deny` refuses at Lucid.
 */
export const authorizeConnection = async (
	session: Session,
	options: { deny?: string } = {},
): Promise<URL> => {
	const started = await session.request<{
		data: { authorizationUrl: string };
	}>({ method: "POST", path: "/api/v1/connection/connect" });
	if (!started.ok) {
		throw new Error(
			`Connecting answered ${started.status}: ${JSON.stringify(started.body)}`,
		);
	}

	const authorize = new URL(started.body.data.authorizationUrl);
	if (options.deny) {
		authorize.searchParams.set(AUTHORIZE_PARAMS.error, options.deny);
	}
	const approved = await fetch(authorize, { redirect: "manual" });
	const callback = new URL(approved.headers.get("location") ?? "");
	const back = await session.fetch(`${callback.pathname}${callback.search}`, {
		redirect: "manual",
	});
	return new URL(back.headers.get("location") ?? "", callback);
};

/**
 * Connects the CMS to the fake Lucid API as an admin session, unless it already is, and returns
 * the connection's ID there. On a shared server another test may have connected it, or connect it
 * first, so it checks again after each try.
 */
export const connectSession = async (admin: Session): Promise<string> => {
	for (let attempt = 0; attempt < 3; attempt++) {
		const status = await connectionStatus(admin);
		if (status.status === "connected" && status.connection) {
			return status.connection.id;
		}
		await authorizeConnection(admin);
	}
	const status = await connectionStatus(admin);
	if (status.status !== "connected" || !status.connection) {
		throw new Error(
			`The CMS did not connect to Lucid: ${JSON.stringify(status)}`,
		);
	}
	return status.connection.id;
};
