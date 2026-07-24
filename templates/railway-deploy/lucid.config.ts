import { configureLucid, z } from "@lucidcms/core";
import { postgres } from "@lucidcms/db-postgres";
import { filesystemPlugin } from "@lucidcms/plugin-filesystem";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { node } from "@lucidcms/runtime-node";
import PageCollection from "./src/collections/pages.js";

export const env = z.object({
	DATABASE_URL: z.string().min(1),
	LUCID_SECRET: z.string().min(32),
	LUCID_HOST: z.url(),
	LUCID_MEDIA_DIRECTORY: z.string().min(1).default("uploads"),
});

export default configureLucid({
	runtime: node({
		server: {
			hostname: "0.0.0.0",
		},
	}),
	db: postgres,
	config: (env) => ({
		host: env.LUCID_HOST,
		secrets: env.LUCID_SECRET,
		http: {
			security: {
				trustProxyHeaders: true,
			},
		},
		collections: [PageCollection],
		plugins: [
			filesystemPlugin({
				uploadDir: env.LUCID_MEDIA_DIRECTORY,
			}),
			pagesPlugin({
				collections: [
					{
						collection: "page",
					},
				],
			}),
		],
	}),
});
