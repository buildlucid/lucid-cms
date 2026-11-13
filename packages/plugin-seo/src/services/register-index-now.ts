import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import sendIndexNowConfig from "../admin/components/SendIndexNow/config.js";
import { PLUGIN_KEY } from "../constants.js";
import registerIndexNowKeyFile from "../http/register-index-now-key-file.js";
import type { SendIndexNowJob } from "../jobs/send-index-now.js";
import indexNowMigration from "../migrations/1789100000000-seo-index-now.js";
import indexNowRoutes from "../routes/index-now.js";
import addRootFiles from "./add-root-files.js";
import indexNowChangeHandler from "./hooks/index-now-change-handler.js";
import indexNowDeployHandler from "./hooks/index-now-deploy-handler.js";
import type {
	SeoIndexNowOptionsInternal,
	SeoPluginOptionsInternal,
} from "./parse-plugin-options.js";

/**
 * Adds IndexNow's URL and state tables, send job, admin routes and Operations tile, and the CMS's own
 * key file. Sends queue once the named deploy succeeds, or on publishes without one.
 */
const registerIndexNow = (
	draft: ResolvedLucidConfig,
	options: SeoPluginOptionsInternal,
	indexNow: SeoIndexNowOptionsInternal,
	job: SendIndexNowJob,
) => {
	draft.migrations.push({
		name: "1789100000000-seo-index-now",
		migration: indexNowMigration,
	});
	draft.jobs.push(job);
	draft.http.routes.push(...indexNowRoutes(job));
	draft.admin.slots.push(sendIndexNowConfig());
	addRootFiles(
		draft,
		`${PLUGIN_KEY}:index-now-key`,
		registerIndexNowKeyFile(indexNow.key),
	);

	if (indexNow.deploy !== undefined) {
		draft.hooks.push({
			service: "deploys",
			event: "afterRunFinish",
			handler: indexNowDeployHandler(indexNow.deploy, job),
		});
		return;
	}
	draft.hooks.push({
		service: "documents",
		event: "afterChange",
		handler: indexNowChangeHandler(options, job),
	});
};

export default registerIndexNow;
