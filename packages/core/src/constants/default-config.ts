import { defaultDirectories } from "../libs/resources/defaults.js";
import type { ResolvedLucidConfig } from "../types/config.js";
import constants from "./constants.js";

export const defaultConfig: Partial<ResolvedLucidConfig> = {
	tables: [],
	access: [],
	directories: defaultDirectories,
	sources: {},
	telemetry: true,
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
	},
	ai: {
		enabled: true,
		features: {
			imageGeneration: true,
			altGeneration: true,
			customFieldGeneration: true,
		},
	},
	localization: { locales: [], defaultLocale: null },
	i18n: {
		locales: [
			{
				label: "English",
				code: "en",
				direction: "ltr",
			},
		],
		defaultLocale: "en",
	},
	migrations: {
		definitions: [],
	},
	seeds: {
		definitions: [],
	},
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
	jobs: {
		definitions: [],
		retention: {
			completedDays: 7,
			failedDays: 30,
		},
	},
	mcp: { enabled: false },
	tools: { definitions: [], disabled: [] },
	hooks: [],
	collections: [],
	plugins: [],
	build: {
		outDir: "dist",
		watch: {
			ignore: [],
		},
	},
	brand: {
		name: "Lucid CMS",
	},
	retention: {
		defaultPurgeAfterDays: constants.retention,
	} satisfies ResolvedLucidConfig["retention"],
};

export default defaultConfig;
