import type constants from "../../../../constants/constants.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../../../i18n/types.js";

export interface BrickOptions {
	details?: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
	};
	thumbnail?: string;
}
export interface BrickConfig {
	key: string;
	details: {
		label: ResolvedAdminCopy;
		description?: ResolvedAdminCopy;
	};
	thumbnail?: string;
}

export type BrickTypes =
	(typeof constants.brickTypes)[keyof typeof constants.brickTypes];
