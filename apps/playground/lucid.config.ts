// import { cloudflareQueuesPlugin } from "@lucidcms/plugin-cloudflare-queues";
// import { redisPlugin } from "@lucidcms/plugin-redis";
// import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";

import { configureLucid, copy, z } from "@lucidcms/core";
// import { passthroughEmailAdapter } from "@lucidcms/core/email";
// import { filesystemPlugin } from "@lucidcms/plugin-filesystem";
import { createServiceContext, PermissionSets } from "@lucidcms/core/plugin";
// import { passthroughQueueAdapter } from "@lucidcms/core/queue";
import { createToolkit } from "@lucidcms/core/toolkit";
// import { resendPlugin } from "@lucidcms/plugin-resend";
// import { s3Plugin } from "@lucidcms/plugin-s3";
import { sqlite } from "@lucidcms/db-sqlite";
import { githubAuthPlugin } from "@lucidcms/plugin-github-auth";
import { googleAuthPlugin } from "@lucidcms/plugin-google-auth";
import { microsoftAuthPlugin } from "@lucidcms/plugin-microsoft-auth";
import { nodemailerPlugin } from "@lucidcms/plugin-nodemailer";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { node } from "@lucidcms/runtime-node";
import { describeRoute } from "hono-openapi";
// Collections
import BlogCollection from "./src/collections/blogs.js";
import MainMenuCollection from "./src/collections/main-menu.js";
import PageCollection from "./src/collections/pages.js";
import SettingsCollection from "./src/collections/settings.js";
import SimpleCollection from "./src/collections/simple.js";
import TestCollection from "./src/collections/test.js";
import transporter from "./src/services/email-transporter.js";

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
	env: z.object({
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
	}),
	config: (env) => ({
		// security: {
		// 	cors: {
		// 		origin: [],
		// 	},
		// },
		// logger: {
		// 	level: "silent",
		// },
		tenants: [
			{
				key: "marketing",
				name: copy("admin:tenants.marketing.name", {
					defaultMessage: "Marketing",
				}),
			},
			{
				key: "documentation",
				name: copy("admin:tenants.documentation.name", {
					defaultMessage: "Documentation",
				}),
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
		openAPI: {
			enabled: true,
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
			groups: {
				pages: {
					name: copy("admin:access.groups.pages.name"),
				},
				blogs: {
					name: copy("admin:access.groups.blogs.name"),
				},
			},
			permissions: {
				"page:full": {
					name: copy("admin:access.permissions.page-full.name"),
					description: copy("admin:access.permissions.page-full.description"),
					group: "pages",
				},
				"page:read": {
					name: copy("admin:access.permissions.page-read.name"),
					group: "pages",
				},
				"page:create": {
					name: copy("admin:access.permissions.page-create.name"),
					group: "pages",
				},
				"page:update": {
					name: copy("admin:access.permissions.page-update.name"),
					group: "pages",
				},
				"page:delete": {
					name: copy("admin:access.permissions.page-delete.name"),
					group: "pages",
				},
				"page:restore": {
					name: copy("admin:access.permissions.page-restore.name"),
					group: "pages",
				},
				"page:publish": {
					name: copy("admin:access.permissions.page-publish.name"),
					group: "pages",
				},
				"page:review": {
					name: copy("admin:access.permissions.page-review.name"),
					group: "pages",
				},
				"page:publish:staging": {
					name: copy("admin:access.permissions.page-publish-staging.name"),
					group: "pages",
				},
				"page:review:staging": {
					name: copy("admin:access.permissions.page-review-staging.name"),
					group: "pages",
				},
				"page:publish:production": {
					name: copy("admin:access.permissions.page-publish-production.name"),
					group: "pages",
				},
				"page:review:production": {
					name: copy("admin:access.permissions.page-review-production.name"),
					group: "pages",
				},
				"blog:full": {
					name: copy("admin:access.permissions.blog-full.name"),
					group: "blogs",
				},
			},
			roles: [
				{
					key: "admin",
					name: copy("admin:access.roles.admin.name"),
					description: copy("admin:access.roles.admin.description"),
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
