import type constants from "../../../../constants/constants.js";
import type { AdminText } from "../../../i18n/types.js";

export interface BrickConfigProps {
	details?: {
		name?: AdminText;
		summary?: AdminText;
	};
	preview?: {
		image?: string;
	};
}
export interface BrickConfig {
	key: string;
	details: {
		name: AdminText;
		summary?: AdminText;
	};
	preview?: {
		image?: string;
	};
}

export type BrickTypes =
	(typeof constants.brickTypes)[keyof typeof constants.brickTypes];
