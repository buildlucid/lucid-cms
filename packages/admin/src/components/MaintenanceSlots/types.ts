import type { ResolvedAdminCopy } from "@lucidcms/types";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { maintenanceSlotPolicies } from "./constants.js";

export type MaintenanceSlot = keyof typeof maintenanceSlotPolicies;

/**
 * Built-in groups are `rebuild` and `remove`. Custom groups appear between them, named by `label`
 * or their key.
 */
export type MaintenanceGroup =
	| string
	| {
			key: string;
			label?: string | ResolvedAdminCopy;
	  };

export type MaintenanceSlotPlacement = {
	/** Adds a tile to the Maintenance section on System → Operations. Render it with `MaintenanceTile`. */
	slot: "maintenance.action";
	/** @default "rebuild" */
	group?: MaintenanceGroup;
};

export type MaintenanceSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: "maintenance.action";
	readonly key: string;
	readonly options: TOptions;
};
