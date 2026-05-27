import type { Config, LucidConfig } from "../types/config.js";
import constants from "./constants.js";

export const coreAiGuidance = [
	{
		key: "improve",
		label: "Improve",
		instructions:
			"Improve the writing while preserving the original meaning and important details.",
	},
	{
		key: "expand",
		label: "Expand",
		instructions:
			"Expand the writing with useful detail while staying relevant and accurate.",
	},
	{
		key: "shorten",
		label: "Shorten",
		instructions:
			"Make the writing shorter while preserving the important details and meaning.",
	},
] satisfies NonNullable<LucidConfig["ai"]>["guidance"];

export const defaultConfig: Partial<LucidConfig> = {
	logger: {
		level: "info",
	},
	security: {
		trustProxyHeaders: false,
		headers: {
			crossOriginResourcePolicy: false,
			xFrameOptions: true,
			referrerPolicy: "strict-origin-when-cross-origin",
		},
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
	openAPI: {
		enabled: false,
	},
	localization: {
		locales: [
			{
				label: "English",
				code: "en",
			},
		],
		defaultLocale: "en",
	},
	media: {
		limits: {
			storage: false,
			fileSize: 16777216,
			processedImages: 10,
		},
		images: {
			presets: {
				thumbnail: {
					height: 200,
					format: "webp",
					quality: 80,
				},
			},
			onDemandFormats: false,
			storeProcessed: true,
		},
		fallback: undefined,
	},
	hono: {
		middleware: [],
		routes: [],
	},
	hooks: [],
	collections: [],
	plugins: [],
	access: {
		groups: {},
		permissions: {},
		roles: [],
	},
	ai: {
		guidance: coreAiGuidance,
	},
	build: {
		paths: {
			outDir: "dist",
			emailTemplates: "./templates",
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
