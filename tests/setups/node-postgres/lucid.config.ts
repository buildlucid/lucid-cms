import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { pages } from "@lucidcms/pages";
import { postgres } from "@lucidcms/postgres";
import {
	getDatabaseUrl,
	harnessEnv,
	sharedCollections,
	sharedConfig,
} from "../../shared/config.ts";
import {
	ArticleCollection,
	localization,
} from "../../shared/fragments/localization.ts";
import LandingPageCollection from "./collections/landing-page.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: postgres((env) => ({ url: getDatabaseUrl(env) })),
	config: (env) => ({
		...sharedConfig({ url: env.HARNESS_URL }),
		localization,
		collections: [
			...sharedCollections,
			ArticleCollection,
			LandingPageCollection,
		],
		plugins: [pages({ collections: [{ key: LandingPageCollection.key }] })],
	}),
});
