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
	media: {
		limits: {
			storage: false,
			fileSize: 16777216,
			processedImages: 10,
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
			onDemandFormats: false,
			storeProcessed: true,
		},
		fallback: undefined,
	},
	hooks: [],
	collections: [],
	plugins: [],
	access: {
		groups: {},
		permissions: {},
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
	softDelete: {
		defaultRetentionDays: constants.retention,
	} satisfies Config["softDelete"],
};

export default defaultConfig;
