import { configureLucid, z } from "@lucidcms/core";
import { postgres } from "@lucidcms/db-postgres";
import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import BlogCollection from "./src/lucid/collections/blogs.js";
import PageCollection from "./src/lucid/collections/pages.js";

export const env = z.object({
	BUILDLUCID_CMS_DB: z
		.object({
			connectionString: z.string(),
		})
		.optional(),
	DATABASE_URL: z.string(),
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
	PREVIEW_ORIGIN: z.url(),
});

export default configureLucid({
	runtime: cloudflare({
		wrangler: "./wrangler.jsonc",
	}),
	db: postgres((env) => ({
		url: env.BUILDLUCID_CMS_DB?.connectionString ?? env.DATABASE_URL,
	})),
	config: (env) => ({
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		localization: {
			locales: [
				{
					label: "English",
					code: "en",
					direction: "ltr",
				},
				{
					label: "French",
					code: "fr",
					direction: "ltr",
				},
			],
			defaultLocale: "en",
		},
		collections: [PageCollection, BlogCollection],
		plugins: [
			pagesPlugin({
				collections: [
					{
						collection: PageCollection.key,
						localized: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
						ui: {
							fullSlug: true,
						},
					},
				],
			}),
			cloudflareKVPlugin(),
			cloudflareR2Plugin({
				bucketName: "lucid-astro-cloudflare-example-media",
			}),
		],
	}),
});
