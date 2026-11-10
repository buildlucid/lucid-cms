// import { cloudflareQueues } from "@lucidcms/cloudflare-queues";
// import { redis } from "@lucidcms/redis";
// import { cloudflareKV } from "@lucidcms/cloudflare-kv";
import { defineConfig, lucidAgent, mcpTools, z } from "@lucidcms/core";
// import { cloudflareTurnstile } from "@lucidcms/cloudflare-turnstile";
import { filesystem } from "@lucidcms/filesystem";
import { githubAuth } from "@lucidcms/github-auth";
import { googleAuth } from "@lucidcms/google-auth";
import { microsoftAuth } from "@lucidcms/microsoft-auth";
import { node } from "@lucidcms/node";
import { nodemailer } from "@lucidcms/nodemailer";
import { pages } from "@lucidcms/pages";
import { seo } from "@lucidcms/seo";
import { sharp } from "@lucidcms/sharp";
import { site } from "@lucidcms/site";
// import { resend } from "@lucidcms/resend";
// import { s3 } from "@lucidcms/s3";
import { sqlite } from "@lucidcms/sqlite";
import { sqliteKV } from "@lucidcms/sqlite-kv";
import { typesense } from "@lucidcms/typesense";
import { workerQueues } from "@lucidcms/worker-queues";
import siteConfig from "./site/site.config.js";
import diagnosticsRoute from "./src/admin/containers/DiagnosticsRoute/config.js";
import publicRoute from "./src/admin/containers/PublicRoute/config.js";
import standaloneRoute from "./src/admin/containers/StandaloneRoute/config.js";
import { assistantAgent } from "./src/agents/assistant.js";
import { seoAgent } from "./src/agents/seo.js";
import BlogCollection from "./src/collections/blogs.js";
import MainMenuCollection from "./src/collections/main-menu.js";
import PageCollection from "./src/collections/pages.js";
import RouteGroupCollection from "./src/collections/route-groups.js";
import RoutePageCollection from "./src/collections/route-pages.js";
import SettingsCollection from "./src/collections/settings.js";
import SimpleCollection from "./src/collections/simple.js";
import TestCollection from "./src/collections/test.js";
import deploys from "./src/deploys/index.js";
import transporter from "./src/email-transporter.js";
import { deployFinishedNotification } from "./src/notifications/deploy-finished.js";
import fakeCiRoute from "./src/routes/fake-ci.js";
import searchMediaRoute from "./src/routes/search-media.js";
import searchRoute from "./src/routes/search.js";
import sendTestEmailRoute from "./src/routes/send-test-email.js";
import sendTestNotificationRoute from "./src/routes/send-test-notification.js";
import siteSearchRoute from "./src/routes/site-search.js";
import testOrganisationsTable from "./src/tables/test-organisations.js";
import { addTool } from "./src/tools/add.js";
import { echoTool } from "./src/tools/echo.js";

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
	SITE_URL: z.url().default("http://localhost:6543"),
	SITE_MODE: z.enum(["ssr", "isr", "static"]).default("isr"),
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
		url: "http://localhost:6543",
		// role: "content",
		auth: {
			// password: {
			// 	enabled: true,
			// },
			// magicLink: {
			// 	enabled: true,
			// },
			// twoFactor: {
			// 	enabled: true,
			// 	required: "super-admins",
			// },
			// passkeys: {
			// 	enabled: true,
			// },
		},
		secrets: {
			encryption: env.LUCID_ENCRYPTION_SECRET,
			cookie: env.LUCID_COOKIE_SECRET,
			refreshToken: env.LUCID_REFRESH_TOKEN_SECRET,
			accessToken: env.LUCID_ACCESS_TOKEN_SECRET,
		},
		ai: {
			mcp: {
				tools: [mcpTools.all(), echoTool, addTool],
			},
			agents: [lucidAgent, assistantAgent, seoAgent],
			// mediaGeneration: {
			// 	image: { models: { default: "openai/gpt-image" } },
			// 	audio: false,
			// },
			// altGeneration: false,
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
		collections: [
			BlogCollection,
			MainMenuCollection,
			PageCollection,
			RouteGroupCollection,
			RoutePageCollection,
			SettingsCollection,
			SimpleCollection,
			TestCollection,
		],
		tables: [testOrganisationsTable],
		notifications: [deployFinishedNotification],
		deploys: [deploys.productionDeploy, deploys.stagingDeploy],
		http: {
			routes: [
				fakeCiRoute,
				searchMediaRoute,
				searchRoute,
				sendTestEmailRoute,
				sendTestNotificationRoute,
				siteSearchRoute,
			],
			openAPI: {
				enabled: true,
			},
		},
		// media: {
		// 	images: {
		// 		presets: {
		// 			card: { width: 800, height: 450, fit: "cover" },
		// 			contained: { width: 800, height: 450, fit: "contain" },
		// 		},
		// 	}
		// },
		admin: {
			// agentHomescreen: false,
			slots: [
				{
					key: "playground-document-picker",
					slot: "agent.widget",
					match: { widget: "playground-document-picker", version: 1 },
					component: "./src/admin/widgets/DocumentPicker.tsx",
				},
				{
					key: "playground-note-editor",
					slot: "agent.widget",
					match: { widget: "playground-note-editor", version: 1 },
					component: "./src/admin/widgets/NoteEditor.tsx",
				},
				{
					key: "playground-note-editor-row",
					slot: "agent.transcriptRow",
					match: { widget: "playground-note-editor", version: 1 },
					component: "./src/admin/widgets/NoteEditorRow.tsx",
				},
				{
					key: "playground-note",
					slot: "agent.widget",
					match: { widget: "playground-note", version: 1 },
					component: "./src/admin/widgets/PlaygroundNote.tsx",
				},
				{
					key: "playground-launch-checklist",
					slot: "home.widget",
					component: "./src/admin/widgets/LaunchChecklist.tsx",
					card: {
						label: "Launch checklist",
						description: "A sample plugin widget with options.",
						size: "sm",
						sizes: ["sm", "md"],
					},
					options: {
						items: ["Check SEO titles", "Review redirects", "Test the forms"],
					},
				},
			],
			routes: [diagnosticsRoute, standaloneRoute, publicRoute],
			scripts: ["./src/admin/startup.ts"],
			stylesheets: ["./src/admin/styles.css"],
		},
		plugins: [
			sqliteKV(),
			seo({ collections: [{ key: "page" }, { key: "settings" }] }),
			workerQueues(),
			// cloudflareTurnstile({
			// 	siteKey: "1x00000000000000000000AA",
			// 	secretKey: "1x0000000000000000000000000000000AA",
			// }),
			typesense({
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
									path: "path",
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
			filesystem({
				// uploadDir: "uploads",
				// secretKey: env.LUCID_LOCAL_STORAGE_SECRET_KEY,
			}),
			sharp(),
			githubAuth({
				clientId: env.GITHUB_CLIENT_ID,
				clientSecret: env.GITHUB_CLIENT_SECRET,
			}),
			googleAuth({
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			}),
			microsoftAuth({
				clientId: env.MICROSOFT_CLIENT_ID,
				clientSecret: env.MICROSOFT_CLIENT_SECRET,
				tenant: env.MICROSOFT_TENANT_ID,
			}),
			pages({
				collections: [
					{
						key: "page",
						localized: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
						ui: {
							placement: { after: "page_title" },
						},
					},
					{
						key: "test",
						localized: true,
					},
					{
						key: "blog",
						localized: true,
						prefix: {
							en: "en/blog",
							fr: "fr/blog",
						},
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
					},
				],
			}),
			nodemailer({
				transporter: transporter,
			}),
			site(siteConfig(env)),
			// redis({
			// 	connection: env.REDIS_CONNECTION,
			// }),
			// resend({
			// 	apiKey: env.LUCID_RESEND_API_KEY,
			// 	webhook: {
			// 		enabled: true,
			// 		secret: env.LUCID_RESEND_WEBHOOK_SECRET,
			// 	},
			// }),
			// s3({
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
