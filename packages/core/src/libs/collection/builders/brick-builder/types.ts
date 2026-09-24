import type constants from "../../../../constants/constants.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../../../i18n/types.js";

/** Display options for a reusable brick. */
export interface BrickOptions {
	/** Copy shown when choosing or editing the brick. */
	details?: {
		/** Display name. Falls back to the brick key when no translation is available. */
		label?: AdminCopyInput;
		/** Short explanation of when to use this brick. */
		description?: AdminCopyInput;
	};
	/** Image URL shown in the brick picker. */
	thumbnail?: string;
}

export interface BrickConfig {
	key: string;
	details: {
		label: ResolvedAdminCopy;
		/** Short explanation of when to use this brick. */
		description?: ResolvedAdminCopy;
	};
	/** Image URL shown in the brick picker. */
	thumbnail?: string;
}

export type BrickTypes =
	(typeof constants.brickTypes)[keyof typeof constants.brickTypes];
