import type { PermissionRequirement, ResolvedAdminCopy } from "@lucidcms/types";
import type { Component } from "solid-js";
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
	/** Hides the tile from users without access. */
	permission?: PermissionRequirement;
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

/** Renders one maintenance tile with `MaintenanceTile`, usually with a button that opens a confirm modal. */
export type MaintenanceSlotComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<MaintenanceSlotProps<TOptions>>;
