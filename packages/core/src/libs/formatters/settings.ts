import type { Config } from "../../types/config.js";
import type { SettingsResponse } from "../../types/response.js";
import LicenseFormatter from "./license.js";

interface SettingsPropsT {
	mediaStorageUsed: number;
	processedImageCount: number;
	licenseKeyLast4: string | null;
	mediaAdapterEnabled: boolean;
}

export default class SettingsFormatter {
	formatSingle = (props: {
		settings: SettingsPropsT;
		config: Config;
	}): SettingsResponse => {
		return {
			email: {
				enabled: props.config.email !== undefined,
				from: props.config.email?.from ?? null,
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
				key: LicenseFormatter.createLicenseKeyFromLast4(
					props.settings.licenseKeyLast4,
				),
			},
		};
	};
}
