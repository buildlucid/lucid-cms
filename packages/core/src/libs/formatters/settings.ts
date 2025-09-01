import type { SettingsResponse } from "../../types/response.js";
import type { Config } from "../../types/config.js";
import LicenseFormatter from "./license.js";

interface SettingsPropsT {
	mediaStorageUsed: number;
	processedImageCount: number;
	licenseKey: string | null;
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
				enabled: props.config.media?.strategy !== undefined,
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
				key: LicenseFormatter.obfuscateLicenseKey(props.settings.licenseKey),
			},
		};
	};
}
