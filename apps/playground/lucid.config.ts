// import CloudflareQueuesPlugin from "@lucidcms/plugin-cloudflare-queues";
// import RedisPlugin from "@lucidcms/plugin-redis";
// import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import GitHubAuth from "@lucidcms/auth-github";
import GoogleAuth from "@lucidcms/auth-google";
import MicrosoftAuth from "@lucidcms/auth-microsoft";
import { configureLucid, z } from "@lucidcms/core";
// import { passthroughEmailAdapter } from "@lucidcms/core/email";
// import { fileSystemMediaAdapter } from "@lucidcms/core/media";
import { createServiceContext, PermissionSets } from "@lucidcms/core/plugin";
// import { passthroughQueueAdapter } from "@lucidcms/core/queue";
import { createToolkit } from "@lucidcms/core/toolkit";
// Plugins
// Adapters
import NodemailerPlugin from "@lucidcms/plugin-nodemailer";
import PagesPlugin from "@lucidcms/plugin-pages";
// import ResendPlugin from "@lucidcms/plugin-resend";
// import S3Plugin from "@lucidcms/plugin-s3";
import { describeRoute } from "hono-openapi";
import BlogCollection from "./src/collections/blogs.js";
import MainMenuCollection from "./src/collections/main-menu.js";
// Collections
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
	adapter: {
		module: "@lucidcms/node-adapter",
		// module: "@lucidcms/cloudflare-adapter",
		// options: {
		// 	server: {
		// 		port: 1092,
		// 	}
		// },
	},
	database: {
		module: "@lucidcms/sqlite-adapter",
		// module: "@lucidcms/postgres-adapter",
		// options: (env) => ({
		// 	url: env?.DATABASE_URL as string,
		// 	max: 5,
		// }),
		// module: "@lucidcms/libsql-adapter",
		// options: (env) => ({
		// 	url: "libsql://lucid-cloudflare-willyallop.aws-eu-west-1.turso.io",
		// 	authToken: env?.TURSO_AUTH_TOKEN as string,
		// }),
	},
	config: (env) => ({
		// security: {
		// 	cors: {
		// 		origin: [],
		// 	},
		// },
		logger: {
			level: "silent",
		},
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
				},
				{
					label: "French",
					code: "fr",
				},
			],
			defaultLocale: "en",
		},
		openAPI: {
			enabled: true,
		},
		media: {
			// adapter: fileSystemMediaAdapter({
			// 	uploadDir: "uploads",
			// 	secretKey: env.LUCID_LOCAL_STORAGE_SECRET_KEY,
			// }),
			limits: {
				fileSize: 200 * 1024 * 1024, // 200MB.
				processedImages: 10,
			},
			images: {
				storeProcessed: true,
				onDemandFormats: true,
			},
			fallback: {
				image: "https://placehold.co/600x400",
				video: "https://cdn.pixabay.com/video/2026/01/05/326081_large.mp4",
			},
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
		hono: {
			routes: [
				async (app) => {
					app.post(
						"/send-test-email",
						describeRoute({
							summary: "Send playground test email",
							description:
								"Sends the playground attachment test email via the Lucid toolkit.",
							tags: ["Playground"],
						}),
						async (c) => {
							const serviceContext = createServiceContext(c);
							const toolkit = createToolkit(serviceContext);

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
								return c.json(
									{
										error: {
											name: result.error.name,
											message: result.error.message,
										},
									},
									result.error.status === 400 ? 400 : 500,
								);
							}

							return c.json({
								data: result.data,
							});
						},
					);
				},
			],
		},
		access: {
			permissionGroups: {
				pagePermissions: {
					name: "Page Permissions",
				},
				blogPermissions: {
					name: "Blog Permissions",
				},
			},
			permissions: {
				"page:full": {
					name: "Full Page Access",
					description: "Grants full access to pages.",
					group: "pagePermissions",
				},
				"page:read": {
					name: "Read Pages",
					group: "pagePermissions",
				},
				"page:create": {
					name: "Create Pages",
					group: "pagePermissions",
				},
				"page:update": {
					name: "Update Pages",
					group: "pagePermissions",
				},
				"page:delete": {
					name: "Delete Pages",
					group: "pagePermissions",
				},
				"page:restore": {
					name: "Restore Pages",
					group: "pagePermissions",
				},
				"page:publish": {
					name: "Publish Pages",
					group: "pagePermissions",
				},
				"page:publish:staging": {
					name: "Publish Pages To Staging",
					group: "pagePermissions",
				},
				"page:publish:production": {
					name: "Publish Pages To Production",
					group: "pagePermissions",
				},
				"blog:full": {
					name: "Full Blog Access",
					group: "blogPermissions",
				},
			},
			roles: [
				{
					key: "admin",
					name: "Admin",
					description: {
						en: "Full admin access for the playground.",
					},
					permissions: [
						...PermissionSets.Users,
						...PermissionSets.Roles,
						...PermissionSets.Media,
						...PermissionSets.Email,
						...PermissionSets.Jobs,
						...PermissionSets.Documents,
						...PermissionSets.Integrations,
						...PermissionSets.Settings,
						"page:full",
						"page:read",
						"page:create",
						"page:update",
						"page:delete",
						"page:restore",
						"page:publish",
						"page:publish:staging",
						"page:publish:production",
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
			GitHubAuth({
				clientId: env.GITHUB_CLIENT_ID,
				clientSecret: env.GITHUB_CLIENT_SECRET,
			}),
			GoogleAuth({
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			}),
			MicrosoftAuth({
				clientId: env.MICROSOFT_CLIENT_ID,
				clientSecret: env.MICROSOFT_CLIENT_SECRET,
				tenant: env.MICROSOFT_TENANT_ID,
			}),
			PagesPlugin({
				collections: [
					{
						collectionKey: "page",
						useTranslations: true,
						displayFullSlug: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
					},
					{
						collectionKey: "test",
						useTranslations: true,
						displayFullSlug: true,
					},
				],
			}),
			// RedisPlugin({
			// 	connection: env.REDIS_CONNECTION,
			// }),
			NodemailerPlugin({
				transporter: transporter,
			}),
			// ResendPlugin({
			// 	apiKey: env.LUCID_RESEND_API_KEY,
			// 	webhook: {
			// 		enabled: true,
			// 		secret: env.LUCID_RESEND_WEBHOOK_SECRET,
			// 	},
			// }),
			// S3Plugin({
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
