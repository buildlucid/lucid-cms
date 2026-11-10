import z from "zod";
import { defaultDirectories } from "../libs/resources/defaults.js";
import type { ResolvedLucidConfig } from "../types/config.js";

export const defaultPasswordSchema = z.string().min(8).max(128);

export const defaultConfig: Partial<ResolvedLucidConfig> = {
	tables: [],
	transfers: [],
	access: [],
	directories: defaultDirectories,
	sources: {},
	role: "primary",
	telemetry: true,
	announcements: true,
	updateChecks: true,
	logger: {
		level: "info",
	},
	http: {
		security: {
			headers: {
				crossOriginResourcePolicy: false,
				xFrameOptions: true,
				referrerPolicy: "strict-origin-when-cross-origin",
			},
		},
		openAPI: {
			enabled: false,
		},
		routes: [],
		extensions: [],
	},
	auth: {
		password: {
			enabled: true,
			schema: defaultPasswordSchema,
		},
		magicLink: {
			enabled: false,
		},
		twoFactor: {
			enabled: true,
			required: false,
		},
		passkeys: {
			enabled: true,
		},
		providers: [],
	},
	email: {
		simulate: false,
		resendWindowDays: 7,
	},
	localization: { locales: [], defaultLocale: null },
	translations: {
		locales: [
			{
				label: "English",
				code: "en",
				direction: "ltr",
			},
		],
		defaultLocale: "en",
	},
	migrations: [],
	seeds: [],
	media: {
		limits: {
			storageBytes: false,
			uploadBytes: 16777216,
		},
		images: {
			presets: {
				"thumbnail-small": {
					height: 200,
					format: "webp",
					quality: 80,
				},
				"thumbnail-medium": {
					height: 500,
					format: "webp",
					quality: 80,
				},
				"thumbnail-large": {
					height: 1000,
					format: "webp",
					quality: 80,
				},
			},
			allowFormatQuery: false,
			cache: {
				enabled: true,
				maxVariantsPerFile: 10,
			},
		},
		video: {},
	},
	queue: {},
	jobs: [],
	deploys: [],
	redirects: [],
	notifications: [],
	hooks: [],
	collections: [],
	plugins: [],
	build: {
		outDir: "dist",
		clientTypes: [],
		watch: {
			ignore: [],
		},
	},
	brand: {
		name: "Lucid CMS",
	},
	retention: {
		deletedDocuments: 30,
		deletedMedia: 30,
		deletedUsers: 30,
		removedCollections: 30,
		removedLocales: 30,
		completedJobs: 7,
		failedJobs: 30,
		notifications: 90,
		deployRuns: 90,
	} satisfies ResolvedLucidConfig["retention"],
};

export default defaultConfig;
