import type constants from "../../../../constants/constants.js";
import type { AdminCopyDescriptor } from "../../../i18n/types.js";

export interface BrickConfigProps {
	details?: {
		name?: AdminCopyDescriptor;
		summary?: AdminCopyDescriptor;
	};
	preview?: {
		image?: string;
	};
	tenantKeys?: string[];
}
export interface BrickConfig {
	key: string;
	details: {
		name: AdminCopyDescriptor;
		summary?: AdminCopyDescriptor;
	};
	preview?: {
		image?: string;
	};
	tenantKeys: string[];
}

export type BrickTypes =
	(typeof constants.brickTypes)[keyof typeof constants.brickTypes];
