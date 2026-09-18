// import { cloudflareQueuesPlugin } from "@lucidcms/plugin-cloudflare-queues";
// import { redisPlugin } from "@lucidcms/plugin-redis";
// import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";
import { defineConfig, z } from "@lucidcms/core";
// import { resendPlugin } from "@lucidcms/plugin-resend";
// import { s3Plugin } from "@lucidcms/plugin-s3";
import { sqlite } from "@lucidcms/db-sqlite";
import { filesystemPlugin } from "@lucidcms/plugin-filesystem";
import { githubAuthPlugin } from "@lucidcms/plugin-github-auth";
import { googleAuthPlugin } from "@lucidcms/plugin-google-auth";
import { microsoftAuthPlugin } from "@lucidcms/plugin-microsoft-auth";
import { nodemailerPlugin } from "@lucidcms/plugin-nodemailer";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { redirectsPlugin } from "@lucidcms/plugin-redirects";
import { seoPlugin } from "@lucidcms/plugin-seo";
import { sharpPlugin } from "@lucidcms/plugin-sharp";
import { typesensePlugin } from "@lucidcms/plugin-typesense";
import { workerQueuePlugin } from "@lucidcms/plugin-worker-queues";
import { node } from "@lucidcms/runtime-node";
import transporter from "./src/email-transporter.js";

export const env = z.object({
	DATABASE_URL: z.string(),
	LUCID_ENCRYPTION_SECRET: z.string(),
	LUCID_COOKIE_SECRET: z.string(),
	LUCID_REFRESH_TOKEN_SECRET: z.string(),
	LUCID_ACCESS_TOKEN_SECRET: z.string(),
	LUCID_LOCAL_STORAGE_SECRET_KEY: z.string(),
	LUCID_RESEND_API_KEY: z.string(),
	LUCID_RESEND_WEBHOOK_SECRET: z.string(),
	GITHUB_CLIENT_ID: z.string(),
	GITHUB_CLIENT_SECRET: z.string(),
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),
	MICROSOFT_CLIENT_ID: z.string(),
	MICROSOFT_CLIENT_SECRET: z.string(),
	MICROSOFT_TENANT_ID: z.string(),
	// REDIS_CONNECTION: z.string(),
	TYPESENSE_HOST: z.string().min(1),
	TYPESENSE_API_KEY: z.string().min(1),
});

export default defineConfig({
	runtime: node,
	// runtime: node({
	// 	server: {
	// 		port: 1092,
	// 	},
	// }),
	db: sqlite,
	// db: postgres((env) => ({
	// 		url: env?.DATABASE_URL as string,
	// 		max: 5,
	// 	})),
	// db: libsql((env) => ({
	// 		url: "libsql://lucid-cloudflare-willyallop.aws-eu-west-1.turso.io",
	// 		authToken: env?.TURSO_AUTH_TOKEN as string,
	// 	})),
	config: (env) => ({
		// logger: {
		// 	level: "debug",
		// },
		auth: {
			password: {
				enabled: true,
			},
		},
		secrets: {
			encryption: env.LUCID_ENCRYPTION_SECRET,
			cookie: env.LUCID_COOKIE_SECRET,
			refreshToken: env.LUCID_REFRESH_TOKEN_SECRET,
			accessToken: env.LUCID_ACCESS_TOKEN_SECRET,
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
				{
					label: "German",
					code: "de",
					direction: "ltr",
				},
			],
			defaultLocale: "en",
		},
		i18n: {
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
				{
					label: "Arabic",
					code: "ar",
					direction: "rtl",
				},
			],
			defaultLocale: "en",
		},
		http: {
			openAPI: {
				enabled: true,
			},
			security: {
				cors: {
					origin: ["http://localhost:5173"],
				},
			},
		},
		// ai: {
		// 	features: {
		// 		imageGeneration: false,
		// 		altGeneration: false,
		// 		customFieldGeneration: false,
		// 	},
		// },
		// media: {
		// 	images: {
		// 		presets: {
		// 			card: { width: 800, height: 450, fit: "cover" },
		// 			contained: { width: 800, height: 450, fit: "contain" },
		// 		},
		// 	}
		// },
		admin: {
			routes: [
				{
					key: "playground",
					path: "playground",
					component: "./src/lucid/admin/Diagnostics.tsx",
					navigation: {
						label: "Admin playground",
						group: "content",
						icon: "extensions",
					},
				},
				{
					key: "standalone-playground",
					path: "standalone-playground",
					component: "./src/lucid/admin/Standalone.tsx",
					layout: "blank",
					navigation: { label: "Standalone playground", group: "content" },
				},
				{
					key: "public-playground",
					path: "public-playground",
					component: "./src/lucid/admin/Public.tsx",
					layout: "blank",
					access: "public",
				},
			],
			scripts: ["./src/lucid/admin/startup.ts"],
			stylesheets: ["./src/lucid/admin/styles.css"],
		},
		plugins: [
			seoPlugin({ collections: [{ key: "page" }, { key: "settings" }] }),
			workerQueuePlugin(),
			typesensePlugin({
				host: env.TYPESENSE_HOST,
				apiKey: env.TYPESENSE_API_KEY,
				indexes: [
					{
						key: "pages",
						alias: "lucid_node_pages",
						schema: {
							fields: [
								{ name: "title", type: "string", optional: true },
								{ name: "path", type: "string", optional: true },
								{ name: "documentId", type: "int32" },
								{ name: "locale", type: "string", facet: true },
							],
						},
						sources: [
							{
								kind: "collection",
								key: "pages",
								collection: "page",
								version: "production",
								locales: ["en", "fr"],
								fields: {
									title: "page_title",
									path: "fullSlug",
									documentId: ({ document }) => document.id,
									locale: ({ locale }) => locale,
								},
							},
						],
					},
					{
						key: "media",
						alias: "lucid_node_pages_media",
						schema: {
							fields: [
								{ name: "title", type: "string", optional: true },
								{ name: "url", type: "string" },
								{ name: "mediaId", type: "int32" },
								{ name: "mediaType", type: "string", facet: true },
								{ name: "locale", type: "string", facet: true },
							],
						},
						sources: [
							{
								kind: "media",
								key: "media",
								locales: ["en", "fr"],
								fields: {
									title: "title",
									url: "url",
									mediaId: ({ media }) => media.id,
									mediaType: ({ media }) => media.type,
									locale: ({ locale }) => locale,
								},
							},
						],
					},
				],
			}),
			filesystemPlugin({
				// uploadDir: "uploads",
				// secretKey: env.LUCID_LOCAL_STORAGE_SECRET_KEY,
			}),
			sharpPlugin(),
			githubAuthPlugin({
				clientId: env.GITHUB_CLIENT_ID,
				clientSecret: env.GITHUB_CLIENT_SECRET,
			}),
			googleAuthPlugin({
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			}),
			microsoftAuthPlugin({
				clientId: env.MICROSOFT_CLIENT_ID,
				clientSecret: env.MICROSOFT_CLIENT_SECRET,
				tenant: env.MICROSOFT_TENANT_ID,
			}),
			pagesPlugin({
				collections: [
					{
						key: "page",
						localized: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
						ui: {
							fullSlug: true,
							placement: { after: "page_title" },
						},
					},
					{
						key: "test",
						localized: true,
						ui: {
							fullSlug: true,
						},
					},
					{
						key: "blog",
						localized: true,
						prefix: "/blog",
						ui: { fullSlug: true },
					},
					{
						key: "route-page",
						prefix: "/docs",
						localized: true,
						segments: [
							{
								relation: "route_group",
								collection: "route-group",
								field: "route_key",
							},
						],
						ui: { fullSlug: true },
					},
				],
			}),
			redirectsPlugin({
				collections: ["page"],
			}),
			nodemailerPlugin({
				transporter: transporter,
			}),
			// redisPlugin({
			// 	connection: env.REDIS_CONNECTION,
			// }),
			// resendPlugin({
			// 	apiKey: env.LUCID_RESEND_API_KEY,
			// 	webhook: {
			// 		enabled: true,
			// 		secret: env.LUCID_RESEND_WEBHOOK_SECRET,
			// 	},
			// }),
			// s3Plugin({
			// 	endpoint: `https://${env?.LUCID_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			// 	bucket: "headless-cms",
			// 	clientOptions: {
			// 		region: "auto",
			// 		accessKeyId: env?.LUCID_S3_ACCESS_KEY as string,
			// 		secretAccessKey: env?.LUCID_S3_SECRET_KEY as string,
			// 	},
			// }),
		],
		// build: {
		// 	outDir: "out",
		// },
		brand: {
			name: "Playground",
		},
	}),
});
