import type { Config } from "../../types/config.js";
import type {
	SettingsInclude,
	SettingsResponse,
} from "../../types/response.js";
import { licenseFormatter } from "./index.js";

interface SettingsPropsT {
	mediaStorageUsed: number;
	processedImageCount: number;
	licenseKeyLast4: string | null;
	mediaAdapterEnabled: boolean;
	mediaAdapterKey: string | null;
	emailAdapterKey: string;
	emailSimulated: boolean;
	emailTemplates: string[];
	imageProcessorKey: string | null;
	runtimeKey: string;
	queueKey: string;
	kvKey: string;
	databaseKey: string;
}

const formatSingle = (props: {
	settings: SettingsPropsT;
	config: Config;
	includes: SettingsInclude[] | undefined;
}): SettingsResponse => {
	const includes = props.includes ?? [];
	if (includes.length === 0) return {};

	const includeSet = new Set(includes);
	const response: SettingsResponse = {};

	if (includeSet.has("email")) {
		response.email = {
			simulated: props.settings.emailSimulated,
			templates: props.settings.emailTemplates,
			from: props.config.email?.from ?? null,
		};
	}

	if (includeSet.has("media")) {
		response.media = {
			enabled: props.settings.mediaAdapterEnabled,
			storage: {
				total: props.config.media.limits.storage,
				remaining:
					props.config.media.limits.storage - props.settings.mediaStorageUsed,
				used: props.settings.mediaStorageUsed,
			},
			processed: {
				stored: props.config.media.images.storeProcessed,
				imageLimit: props.config.media.limits.processedImages,
				total: props.settings.processedImageCount,
			},
		};
	}

	if (includeSet.has("license")) {
		response.license = {
			key: licenseFormatter.createLicenseKeyFromLast4(
				props.settings.licenseKeyLast4,
			),
		};
	}

	if (includeSet.has("system")) {
		response.system = {
			runtime: props.settings.runtimeKey,
			database: props.settings.databaseKey,
			kv: props.settings.kvKey,
			queue: props.settings.queueKey,
			media: props.settings.mediaAdapterKey,
			email: props.settings.emailAdapterKey,
			imageProcessor: props.settings.imageProcessorKey,
		};
	}

	return response;
};

export default {
	formatSingle,
};
