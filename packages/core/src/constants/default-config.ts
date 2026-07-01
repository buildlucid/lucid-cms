import type { Config, LucidConfig } from "../types/config.js";
import constants from "./constants.js";

export const defaultConfig: Partial<LucidConfig> = {
	logger: {
		level: "info",
	},
	http: {
		security: {
			trustProxyHeaders: false,
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
		},
		providers: [],
	},
	email: {
		simulate: false,
		resendWindowDays: 7,
		templates: {
			directory: "./templates",
		},
	},
	ai: {
		enabled: true,
		features: {
			imageGeneration: true,
			altGeneration: true,
			customFieldGeneration: true,
		},
	},
	localization: {
		locales: [
			{
				label: "English",
				code: "en",
				direction: "ltr",
			},
		],
		defaultLocale: "en",
	},
	tenants: [],
	i18n: {
		locales: [
			{
				label: "English",
				code: "en",
				direction: "ltr",
			},
		],
		defaultLocale: "en",
		sources: [],
	},
	migrations: {
		sources: [],
	},
	media: {
		limits: {
			storageBytes: false,
			uploadBytes: 16777216,
			processedImagesPerFile: 10,
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
			storeProcessed: true,
		},
		video: {},
	},
	hooks: [],
	collections: [],
	plugins: [],
	access: {
		groups: {},
		roles: [],
	},
	build: {
		paths: {
			outDir: "dist",
			copyPublic: [],
		},
		watch: {
			ignore: [],
		},
	},
	retention: {
		defaultPurgeAfterDays: constants.retention,
	} satisfies Config["retention"],
};

export default defaultConfig;
