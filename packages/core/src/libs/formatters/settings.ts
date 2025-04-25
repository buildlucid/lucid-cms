import type { SettingsResponse } from "../../types/response.js";
import type { Config } from "../../types/config.js";

interface SettingsPropsT {
	mediaStorageUsed: number;
	processedImageCount: number;
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
					total: props.config.media.storage,
					remaining:
						props.config.media.storage - props.settings.mediaStorageUsed,
					used: props.settings.mediaStorageUsed,
				},
				processed: {
					stored: props.config.media.processed.store,
					imageLimit: props.config.media.processed.limit,
					total: props.settings.processedImageCount,
				},
			},
		};
	};
}
