import { cloudflare } from "@lucidcms/cloudflare";
import { cloudflareKV } from "@lucidcms/cloudflare-kv";
import { cloudflareR2 } from "@lucidcms/cloudflare-r2";
import { defineConfig, z } from "@lucidcms/core";
import { pages } from "@lucidcms/pages";
import { postgres } from "@lucidcms/postgres";
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
});

export default defineConfig({
	env: env,
	runtime: cloudflare,
	db: postgres((env) => ({
		url: env.BUILDLUCID_CMS_DB?.connectionString ?? env.DATABASE_URL,
	})),
	config: (env) => ({
		url: "http://localhost:4321",
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		collections: [BlogCollection, PageCollection],
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
		plugins: [
			pages({
				collections: [
					{
						key: PageCollection.key,
						localized: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
					},
				],
			}),
			cloudflareKV(),
			cloudflareR2({
				bucketName: "lucid-astro-cloudflare-example-media",
			}),
		],
	}),
});
