import { copy, logger, z } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { indexNow, PLUGIN_KEY } from "../../constants.js";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import diffUrls from "./diff-urls.js";
import getListedUrls from "./get-listed-urls.js";
import getStoredUrls from "./get-stored-urls.js";
import isLocalHost from "./is-local-host.js";
import type { IndexNowTables } from "./tables.js";

const revisionSchema = z.object({ revision: z.coerce.number() });

/**
 * Marks new, changed and removed URLs with a revision; leaves unchanged rows alone. Commit before
 * sending so failures remain pending. Returns the revision to prevent clearing newer changes.
 */
const markChanges: ServiceFn<
	[{ options: SeoPluginOptionsInternal }],
	number
> = async (context, data) => {
	try {
		const db = context.db.kysely.$extendTables<IndexNowTables>();
		const adapter = context.config.db;
		const yes = adapter.getDefault("boolean", "true");
		const no = adapter.getDefault("boolean", "false");

		//* first, so marks queue behind each other: on Postgres a mark running alongside waits here for
		//* this one to commit, then reads what it stored. SQLite and LibSQL run one writer at a time.
		const bumpQuery = db
			.updateTable(indexNow.stateTable)
			.set((eb) => ({ revision: eb("revision", "+", 1) }))
			.returning("revision");
		const bumpRes = await context.db
			.query("seo.index-now.state.bump", () => bumpQuery)
			.first({ schema: revisionSchema, required: true });
		if (bumpRes.error) return bumpRes;
		const { revision } = bumpRes.data;

		const listedRes = await getListedUrls(context, { options: data.options });
		if (listedRes.error) return listedRes;
		const storedRes = await getStoredUrls(context);
		if (storedRes.error) return storedRes;

		//* search engines can't reach local hosts, so their pages are never stored or sent
		const listed = new Map<string, string | null>();
		const localOrigins = new Set<string>();
		for (const [url, lastModified] of listedRes.data) {
			const { origin, hostname } = new URL(url);
			if (isLocalHost(hostname)) localOrigins.add(origin);
			else listed.set(url, lastModified);
		}
		for (const origin of localOrigins) {
			logger.info({
				message:
					"IndexNow skipped a local site origin, which search engines can't reach",
				owner: PLUGIN_KEY,
				data: { origin },
			});
		}

		const { changed, removed } = diffUrls(listed, storedRes.data);

		const upsertSize = adapter.getQueryBatchSize({ parametersPerItem: 5 });
		for (let offset = 0; offset < changed.length; offset += upsertSize) {
			const upsertQuery = db
				.insertInto(indexNow.urlsTable)
				.values(
					changed.slice(offset, offset + upsertSize).map((change) => ({
						url: change.url,
						last_modified: change.lastModified,
						listed: yes,
						pending: yes,
						revision,
					})),
				)
				.onConflict((conflict) =>
					conflict.column("url").doUpdateSet((eb) => ({
						last_modified: eb.ref("excluded.last_modified"),
						listed: eb.ref("excluded.listed"),
						pending: eb.ref("excluded.pending"),
						revision: eb.ref("excluded.revision"),
					})),
				);
			const upsertRes = await context.db
				.query("seo.index-now.urls.mark", () => upsertQuery)
				.many();
			if (upsertRes.error) return upsertRes;
		}

		const removeSize = adapter.getQueryBatchSize({
			parametersPerItem: 1,
			reservedParameters: 3,
		});
		for (let offset = 0; offset < removed.length; offset += removeSize) {
			const removeQuery = db
				.updateTable(indexNow.urlsTable)
				.set({ listed: no, pending: yes, revision })
				.where("url", "in", removed.slice(offset, offset + removeSize));
			const removeRes = await context.db
				.query("seo.index-now.urls.unlist", () => removeQuery)
				.many();
			if (removeRes.error) return removeRes;
		}

		return { error: undefined, data: revision };
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.seo.index.now.urls.failed"),
			},
			data: undefined,
		};
	}
};

export default markChanges;
