import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { pages } from "@lucidcms/pages";
import { postgres } from "@lucidcms/postgres";
import { workerQueues } from "@lucidcms/worker-queues";
import { harnessEnv } from "#harness/config";
import { getDatabaseUrl } from "../../shared/config/config.ts";
import {
	ArticleCollection,
	GuideCollection,
	localization,
} from "../../shared/config/fragments/localization.ts";
import { nodeHarnessConfig } from "../../shared/config/node-config.ts";
import LandingPageCollection from "./collections/landing-page.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: postgres((env) => ({ url: getDatabaseUrl(env) })),
	config: (env) =>
		nodeHarnessConfig(env, {
			localization,
			collections: [ArticleCollection, GuideCollection, LandingPageCollection],
			plugins: [
				pages({ collections: [{ key: LandingPageCollection.key }] }),
				//* host mode runs a stand-in with the same key, as nothing is built to start the thread from
				workerQueues(),
			],
		}),
});
