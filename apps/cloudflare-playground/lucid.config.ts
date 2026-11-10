import { cloudflare } from "@lucidcms/cloudflare";
import { cloudflareImages } from "@lucidcms/cloudflare-images";
import { cloudflareKV } from "@lucidcms/cloudflare-kv";
import { cloudflareQueues } from "@lucidcms/cloudflare-queues";
import { cloudflareR2 } from "@lucidcms/cloudflare-r2";
import { defineConfig, z } from "@lucidcms/core";
import { pages } from "@lucidcms/pages";
import { postgres } from "@lucidcms/postgres";
import PageCollection from "./src/collections/pages.js";

export const env = z.object({
	LUCID_DB: z.object({ connectionString: z.string() }),
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
});

export default defineConfig({
	runtime: cloudflare,
	db: postgres((env) => ({ url: env.LUCID_DB.connectionString })),
	config: (env) => ({
		url: "http://localhost:6543",
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		collections: [PageCollection],
		plugins: [
			pages({
				collections: [
					{
						key: PageCollection.key,
					},
				],
			}),
			cloudflareImages(),
			cloudflareKV(),
			cloudflareQueues(),
			cloudflareR2(),
		],
	}),
});
