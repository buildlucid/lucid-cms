import type { Config } from "../../types/config.js";
import type { SettingsResponse } from "../../types/response.js";
import { licenseFormatter } from "./index.js";

interface SettingsPropsT {
	mediaStorageUsed: number;
	processedImageCount: number;
	licenseKeyLast4: string | null;
	mediaAdapterEnabled: boolean;
}

const formatSingle = (props: {
	settings: SettingsPropsT;
	config: Config;
}): SettingsResponse => {
	return {
		email: {
			from: props.config.email.from,
		},
		media: {
			enabled: props.settings.mediaAdapterEnabled,
			storage: {
				total: props.config.media.storageLimit,
				remaining:
					props.config.media.storageLimit - props.settings.mediaStorageUsed,
				used: props.settings.mediaStorageUsed,
			},
			processed: {
				stored: props.config.media.storeProcessedImages,
				imageLimit: props.config.media.processedImageLimit,
				total: props.settings.processedImageCount,
			},
		},
		license: {
			key: licenseFormatter.createLicenseKeyFromLast4(
				props.settings.licenseKeyLast4,
			),
		},
	};
};

export default {
	formatSingle,
};
