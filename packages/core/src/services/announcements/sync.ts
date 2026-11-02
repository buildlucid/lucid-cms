import { satisfies } from "semver";
import packageJson from "../../../package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import logger from "../../libs/logger/index.js";
import getRemoteAnnouncements from "../../libs/lucid-remote/services/get-announcements/index.js";
import { NotificationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import handleRemoteError from "../connection/helpers/handle-remote-error.js";
import { resolveEffectiveConnection } from "../connection/storage.js";
import getAccessToken from "../connection/token-manager.js";
import resolve from "../notifications/resolve.js";
import upsert from "../notifications/upsert.js";
import { announcementNotification } from "./notifications/announcement.js";
import { securityAlertNotification } from "./notifications/security-alert.js";

const definitions = {
	announcement: announcementNotification,
	security: securityAlertNotification,
};

/** Links may only open Lucid's site or the Lucid GitHub organisation. Returns the normalised link, or null for any other. */
const getLucidUrl = (value: string) => {
	if (!URL.canParse(value)) return null;

	const url = new URL(value);
	const allowed =
		url.protocol === "https:" &&
		(url.hostname === "lucidjs.build" ||
			url.hostname.endsWith(".lucidjs.build") ||
			(url.hostname === "github.com" &&
				(url.pathname === "/buildlucid" ||
					url.pathname.startsWith("/buildlucid/"))));
	return allowed ? url.href : null;
};

/**
 * Syncs version-matched announcements and their audiences, preserving unchanged notifications.
 * Resolves ended or inapplicable items. Network failures are logged without changing
 * notifications.
 */
const syncAnnouncements: ServiceFn<[], undefined> = async (context) => {
	if (!context.config.announcements) {
		return { error: undefined, data: undefined };
	}

	const connection = await resolveEffectiveConnection(context);
	if (connection.error) return connection;

	const token =
		connection.data?.status === "connected"
			? await getAccessToken(context, { connection: connection.data })
			: undefined;
	const remote = token?.error
		? { error: token.error, data: undefined }
		: await getRemoteAnnouncements(context, {
				accessToken: token?.data.accessToken ?? null,
			});
	if (remote.error) {
		//* a rejected token revokes the connection, as it does for other Lucid requests
		if (token?.data) await handleRemoteError(context, remote.error);
		logger.warn({
			event: "announcements.sync.unavailable",
			scope: constants.logScopes.lucid,
			message:
				"Couldn't get announcements from Lucid. Set `announcements: false` to stop checking.",
			data: { status: remote.error.status },
		});
		return { error: undefined, data: undefined };
	}

	const live = remote.data.filter(
		(announcement) =>
			announcement.lucidVersions === null ||
			satisfies(packageJson.version, announcement.lucidVersions, {
				includePrerelease: true,
			}),
	);

	const liveKeys = new Set<string>();
	for (const announcement of live) {
		const definition = definitions[announcement.type];
		const key = `announcement:${announcement.publicId}`;
		liveKeys.add(`${definition.key}:${key}`);

		const upsertRes = await upsert(context, {
			definition,
			key,
			data: {
				title: announcement.title,
				message: announcement.message,
				url: announcement.url ? getLucidUrl(announcement.url) : null,
			},
		});
		if (upsertRes.error) return upsertRes;
	}

	const Notifications = new NotificationsRepository(context.db);
	const openRes = await Notifications.selectMultiple({
		select: ["type", "key"],
		where: [
			{
				key: "type",
				operator: "in",
				value: [announcementNotification.key, securityAlertNotification.key],
			},
			{ key: "resolved_at", operator: "is", value: null },
		],
	});
	if (openRes.error) return openRes;

	for (const row of openRes.data ?? []) {
		if (row.key === null || liveKeys.has(`${row.type}:${row.key}`)) continue;

		const resolveRes = await resolve(context, {
			definition:
				row.type === securityAlertNotification.key
					? securityAlertNotification
					: announcementNotification,
			key: row.key,
		});
		if (resolveRes.error) return resolveRes;
	}

	return { error: undefined, data: undefined };
};

export default syncAnnouncements;
