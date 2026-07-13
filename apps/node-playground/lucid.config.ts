// import { cloudflareQueuesPlugin } from "@lucidcms/plugin-cloudflare-queues";
// import { redisPlugin } from "@lucidcms/plugin-redis";
// import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";

import { configureLucid, z } from "@lucidcms/core";
import { createRoute, PermissionSets } from "@lucidcms/core/plugin";
// import { passthroughQueueAdapter } from "@lucidcms/core/queue";
import { createToolkit } from "@lucidcms/core/toolkit";
// import { resendPlugin } from "@lucidcms/plugin-resend";
// import { s3Plugin } from "@lucidcms/plugin-s3";
import { sqlite } from "@lucidcms/db-sqlite";
// import { passthroughEmailAdapter } from "@lucidcms/core/email";
import { filesystemPlugin } from "@lucidcms/plugin-filesystem";
import { githubAuthPlugin } from "@lucidcms/plugin-github-auth";
import { googleAuthPlugin } from "@lucidcms/plugin-google-auth";
import { microsoftAuthPlugin } from "@lucidcms/plugin-microsoft-auth";
import { nodemailerPlugin } from "@lucidcms/plugin-nodemailer";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { workerQueuePlugin } from "@lucidcms/plugin-worker-queues";
import { node } from "@lucidcms/runtime-node";
// Collections
import BlogCollection from "./src/collections/blogs.js";
import MainMenuCollection from "./src/collections/main-menu.js";
import PageCollection from "./src/collections/pages.js";
import SettingsCollection from "./src/collections/settings.js";
import SimpleCollection from "./src/collections/simple.js";
import TestCollection from "./src/collections/test.js";
import transporter from "./src/services/email-transporter.js";

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
});

export default configureLucid({
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
		// 	level: "silent",
		// },
		tenants: [
			{
				key: "marketing",
				name: "Marketing",
				default: true,
			},
			{
				key: "documentation",
				name: "Documentation",
			},
		],
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
			// 	security: {
			// 		cors: {
			// 			origin: [],
			// 		},
			// 	},
			routes: [
				createRoute({
					method: "post",
					path: "/send-test-email",
					openAPI: {
						summary: "Send playground test email",
						description:
							"Sends the playground attachment test email via the Lucid toolkit.",
						tags: ["Playground"],
					},
					handler: async ({ hono, context }) => {
						const toolkit = createToolkit(context);

						const result = await toolkit.email.send({
							to: "hello@williamyallop.com",
							subject: "Lucid playground attachment test",
							template: "attachment-test",
							attachments: [
								{
									type: "url",
									url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
									filename: "dummy.pdf",
									contentType: "application/pdf",
								},
								{
									type: "url",
									url: "https://www.w3.org/assets/logos/w3c/w3c-no-bars.svg",
									filename: "inline-logo.svg",
									contentType: "image/svg+xml",
									disposition: "inline",
									contentId: "playground-inline-logo",
								},
							],
							data: {
								name: "William",
								attachmentName: "dummy.pdf",
							},
						});

						if (result.error) {
							return hono.json(
								{
									error: {
										name: result.error.name,
										message: result.error.message,
									},
								},
								result.error.status === 400 ? 400 : 500,
							);
						}

						return hono.json({
							data: result.data,
						});
					},
				}),
			],
		},
		// email: {
		// 	adapter: passthroughEmailAdapter,
		// },
		queue: {
			// adapter: passthroughQueueAdapter,
			// adapter: passthroughQueueAdapter({
			// 	bypassImmediateExecution: false,
			// }),
		},
		// hooks: [
		// 	{
		// 		service: "documents",
		// 		event: "beforeUpsert",
		// 		handler: async (context, data) => {
		// 			console.log("collection doc hook", data.meta.collectionKey);
		// 		},
		// 	},
		// ],
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
		access: {
			groups: {
				pages: {
					name: "Page Permissions",
					permissions: {
						"page:full": {
							name: "Full Page Access",
							description: "Grants full access to pages.",
						},
						"page:read": {
							name: "Read Pages",
						},
						"page:create": {
							name: "Create Pages",
						},
						"page:update": {
							name: "Update Pages",
						},
						"page:delete": {
							name: "Delete Pages",
						},
						"page:restore": {
							name: "Restore Pages",
						},
						"page:publish": {
							name: "Publish Pages",
						},
						"page:review": {
							name: "Review Page Publish Requests",
						},
						"page:publish:staging": {
							name: "Publish Pages To Staging",
						},
						"page:review:staging": {
							name: "Review Page Publish Requests To Staging",
						},
						"page:publish:production": {
							name: "Publish Pages To Production",
						},
						"page:review:production": {
							name: "Review Page Publish Requests To Production",
						},
					},
				},
				blogs: {
					name: "Blog Permissions",
					permissions: {
						"blog:full": {
							name: "Full Blog Access",
						},
					},
				},
			},
			roles: [
				{
					key: "admin",
					name: "Admin",
					description: "Full admin access for the playground.",
					permissions: [
						...PermissionSets.Users,
						...PermissionSets.Roles,
						...PermissionSets.Media,
						...PermissionSets.Email,
						...PermissionSets.Jobs,
						...PermissionSets.Documents,
						...PermissionSets.Integrations,
						...PermissionSets.Settings,
						...PermissionSets.Ai,
						"page:full",
						"page:read",
						"page:create",
						"page:update",
						"page:delete",
						"page:restore",
						"page:publish",
						"page:review",
						"page:publish:staging",
						"page:review:staging",
						"page:publish:production",
						"page:review:production",
						"blog:full",
					],
				},
			],
		},
		collections: [
			PageCollection,
			BlogCollection,
			MainMenuCollection,
			SettingsCollection,
			TestCollection,
			SimpleCollection,
		],
		plugins: [
			workerQueuePlugin(),
			filesystemPlugin(),
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
						collectionKey: "page",
						localized: true,
						displayFullSlug: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
					},
					{
						collectionKey: "test",
						localized: true,
						displayFullSlug: true,
					},
				],
			}),
			// redisPlugin({
			// 	connection: env.REDIS_CONNECTION,
			// }),
			nodemailerPlugin({
				transporter: transporter,
			}),
			// filesystemPlugin({
			// 	uploadDir: "uploads",
			// 	secretKey: env.LUCID_LOCAL_STORAGE_SECRET_KEY,
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
		// 	paths: {
		// 		outDir: "out",
		// 	},
		// },
		brand: {
			name: "Playground",
		},
	}),
});
