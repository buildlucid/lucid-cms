import T from "../translations/index.js";
import permissionGroups from "./permission-groups.js";

export default Object.freeze({
	locales: ["en"] as const,
	openAPIDocsRoute: "/documentation",
	headers: {
		csrf: "_csrf",
		contentLocale: "lucid-content-locale",
	},
	cookies: {
		csrf: "_csrf",
		refreshToken: "_refresh",
		accessToken: "_access",
	},
	scrypt: {
		N: 2 ** 16, // 65536 iterations
		r: 8,
		p: 1,
		dkLen: 32,
	},
	seedDefaults: {
		roles: [
			{
				name: "Admin",
				description: "The admin role has permissions to do everything.",
				permissions: [
					...permissionGroups.users.permissions,
					...permissionGroups.roles.permissions,
					...permissionGroups.media.permissions,
					...permissionGroups.emails.permissions,
					...permissionGroups.content.permissions,
					...permissionGroups["client-integrations"].permissions,
				],
			},
			{
				name: "Editor",
				description: "The editor role has permissions to manage content.",
				permissions: [
					...permissionGroups.media.permissions,
					...permissionGroups.content.permissions,
				],
			},
		],
	},
	fieldBuiler: {
		maxRepeaterDepth: 3,
	},
	collectionBuilder: {
		isLocked: false,
		useDrafts: false,
		useRevisions: false,
		useTranslations: false,
		useAutoSave: false,
	},
	customFields: {
		link: {
			targets: ["_self", "_blank", "_parent", "_top", "framename"],
		},
	},
	query: {
		page: 1,
		perPage: 10,
	},
	locations: {
		resetPassword: "/admin/reset-password",
	},
	errors: {
		name: T("default_error_name"),
		message: T("default_error_message"),
		status: 500,
		code: undefined,
		errors: undefined,
	},
	emailTemplates: {
		resetPassword: "reset-password",
		userInvite: "user-invite",
		passwordResetSuccess: "password-reset-success",
		emailChanged: "email-changed",
	},
	emailRenderedOutput: "email-templates.json",
	rateLimit: {
		max: 100,
		timeWindow: "1 minute", // ms format - https://github.com/vercel/ms
	},
	directories: {
		public: "public",
		temp: ".lucid",
	},
	vite: {
		dist: "admin",
		mount: "mount.jsx",
		html: "index.html",
		rootSelector: "root",
		buildMetadata: "build-metadata.json",
		port: 24678,
	},
	brickTypes: {
		builder: "builder",
		fixed: "fixed",
	} as const,
	db: {
		prefix: "lucid_",
		collectionKeysJoin: "__",
		generatedColumnPrefix: "_" as const,
	},
	logScopes: {
		lucid: "lucid",
		migrations: "migrations",
		cron: "cron",
		config: "config",
		sync: "sync",
		query: "query",
		http: "http",
		validation: "validation",
	} as const,
	retention: {
		deletedCollections: 30, // days
		deletedLocales: 30, // days
	},
	cronSchedule: "0 0 * * *",
	csrfExpiration: 604800, // 7 days in seconds
	refreshTokenExpiration: 604800, // 7 days in seconds
	accessTokenExpiration: 300, // 5 minutes in seconds
	passwordResetTokenExpirationMinutes: 15, // 15 minutes
	userInviteTokenExpirationMinutes: 1440, // 24 hours in minutes
	documentation: "https://lucidcms.io/getting-started",
	lucidUi: "https://lucidui.io/",
	mediaAwaitingSyncInterval: 3600000, // 1 hour in ms
	media: {
		imagePresetQuality: 80,
	},
	config: {
		filename: "lucid.config",
		extensions: [".ts", ".js", ".mjs", ".mts"],
	},
});
