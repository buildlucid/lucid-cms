import { copy } from "../libs/i18n/index.js";
import type { Config, LucidConfig } from "../types/config.js";
import constants from "./constants.js";

export const coreAiGuidance = [
	{
		key: "improve",
		label: copy("admin:core.ai.guidance.improve.label", {
			defaultMessage: "Improve",
		}),
		instructions:
			"Improve the writing while preserving the original meaning and important details.",
		availability: "global",
	},
	{
		key: "expand",
		label: copy("admin:core.ai.guidance.expand.label", {
			defaultMessage: "Expand",
		}),
		instructions:
			"Expand the writing with useful detail while staying relevant and accurate.",
		availability: "global",
	},
	{
		key: "shorten",
		label: copy("admin:core.ai.guidance.shorten.label", {
			defaultMessage: "Shorten",
		}),
		instructions:
			"Make the writing shorter while preserving the important details and meaning.",
		availability: "global",
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
