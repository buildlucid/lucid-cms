import type constants from "../../../../constants/constants.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../../../i18n/types.js";

export interface BrickConfigProps {
	details?: {
		name?: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	preview?: {
		image?: string;
	};
	tenantKeys?: string[];
}
export interface BrickConfig {
	key: string;
	details: {
		name: ResolvedAdminCopy;
		summary?: ResolvedAdminCopy;
	};
	preview?: {
		image?: string;
	};
	tenantKeys: string[];
}

export type BrickTypes =
	(typeof constants.brickTypes)[keyof typeof constants.brickTypes];
