import type constants from "../../../constants/constants.js";
import type { LocaleValue } from "../../../types/shared.js";

export interface BrickConfigProps {
	details?: {
		name?: LocaleValue;
		summary?: LocaleValue;
	};
	preview?: {
		image?: string;
	};
}
export interface BrickConfig {
	key: string;
	details: {
		name: LocaleValue;
		summary?: LocaleValue;
	};
	preview?: {
		image?: string;
	};
}

export type BrickTypes =
	(typeof constants.brickTypes)[keyof typeof constants.brickTypes];
