import type { PermissionRequirement, ResolvedAdminCopy } from "@lucidcms/types";
import type { Component } from "solid-js";
import type { AdminOptions } from "../../extensions/types/config.js";
import type {
	dashboardWidgetSizes,
	dashboardWidgetSlotPolicies,
} from "./constants.js";

export type DashboardWidgetSlot = keyof typeof dashboardWidgetSlotPolicies;

/** `sm` is a third of a wide row, `md` half, `lg` two thirds and `full` the whole row. */
export type DashboardWidgetSize = (typeof dashboardWidgetSizes)[number];

export type DashboardWidgetPlacement = {
	/** Adds a widget to the Home overview. Users can hide, resize and reorder it. */
	slot: "dashboard.widget";
	/** Hides the widget from users without access. */
	permission?: PermissionRequirement;
	/** How the widget's card is named and sized on the overview grid. */
	card: {
		label: string | ResolvedAdminCopy;
		/** Shown when users choose which widgets to show. */
		description?: string | ResolvedAdminCopy;
		/** The starting size. @default "md" */
		size?: DashboardWidgetSize;
		/** The sizes users can pick. @default every size */
		sizes?: DashboardWidgetSize[];
		/** Leaves the widget off until a user turns it on. */
		hidden?: boolean;
	};
};

export type DashboardWidgetProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: "dashboard.widget";
	readonly key: string;
	/** The size the user picked, so the widget can show more or less. */
	readonly size: DashboardWidgetSize;
	readonly options: TOptions;
};

export type DashboardWidgetComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<DashboardWidgetProps<TOptions>>;
