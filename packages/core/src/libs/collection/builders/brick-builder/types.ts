import type constants from "../../../../constants/constants.js";
import type { AdminTextDescriptor } from "../../../i18n/types.js";

export interface BrickConfigProps {
	details?: {
		name?: AdminTextDescriptor;
		summary?: AdminTextDescriptor;
	};
	preview?: {
		image?: string;
	};
}
export interface BrickConfig {
	key: string;
	details: {
		name: AdminTextDescriptor;
		summary?: AdminTextDescriptor;
	};
	preview?: {
		image?: string;
	};
}

export type BrickTypes =
	(typeof constants.brickTypes)[keyof typeof constants.brickTypes];
