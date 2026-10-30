import type constants from "../../../../constants/constants.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../../../i18n/types.js";
import type { FieldPermissions } from "../../../permission/types.js";
import type { AiInstructionsConfig } from "../../ai-instructions.js";

/** Display options for a reusable brick. */
export interface BrickOptions {
	/** Copy shown when choosing or editing the brick. */
	details?: {
		/** Display name. Falls back to the brick key when no translation is available. */
		label?: AdminCopyInput;
		/** Short explanation of when to use this brick. */
		description?: AdminCopyInput;
	};
	/** Guidance for agents writing this brick's content. */
	ai?: AiInstructionsConfig;
	/** Image URL shown in the brick picker. */
	thumbnail?: string;
	/** Read and update permissions for this brick wherever used, with embedded bricks accepting only `update`. */
	permissions?: FieldPermissions;
}

export interface BrickConfig {
	key: string;
	details: {
		label: ResolvedAdminCopy;
		/** Short explanation of when to use this brick. */
		description?: ResolvedAdminCopy;
	};
	/** Guidance for agents writing this brick's content. */
	ai?: AiInstructionsConfig;
	/** Image URL shown in the brick picker. */
	thumbnail?: string;
	/** Permissions needed to see and change this brick wherever it is used. */
	permissions?: FieldPermissions;
}

export type BrickTypes =
	(typeof constants.brickTypes)[keyof typeof constants.brickTypes];
