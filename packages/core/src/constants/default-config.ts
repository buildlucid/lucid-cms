import type { Config, LucidConfig } from "../types/config.js";
import constants from "./constants.js";

export const defaultConfig: Partial<LucidConfig> = {
	logger: {
		level: "info",
	},
	auth: {
		password: {
			enabled: true,
		},
		providers: [],
	},
	email: {
		simulate: false,
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
			storage: 5368709120,
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
