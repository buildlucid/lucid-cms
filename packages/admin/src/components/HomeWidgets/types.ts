import type {
	HomeWidgetSize,
	PermissionRequirement,
	ResolvedAdminCopy,
} from "@lucidcms/types";
import type { Component } from "solid-js";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { homeWidgetSlotPolicies } from "./constants.js";

export type HomeWidgetSlot = keyof typeof homeWidgetSlotPolicies;

export type { HomeWidgetSize };

export type HomeWidgetPlacement = {
	/** Adds a Home overview widget users can hide, resize and reorder. */
	slot: "home.widget";
	/** Hides the widget from users without access. */
	permission?: PermissionRequirement;
	/** How the widget's card is named and sized on the overview grid. */
	card: {
		label: string | ResolvedAdminCopy;
		/** Shown when users choose which widgets to show. */
		description?: string | ResolvedAdminCopy;
		/** The starting size. @default "md" */
		size?: HomeWidgetSize;
		/** The sizes users can pick. @default every size */
		sizes?: HomeWidgetSize[];
		/** Leaves the widget off until a user turns it on. */
		hidden?: boolean;
	};
};

export type HomeWidgetProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: "home.widget";
	readonly key: string;
	/** The size the user picked, so the widget can show more or less. */
	readonly size: HomeWidgetSize;
	readonly options: TOptions;
};

export type HomeWidgetComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<HomeWidgetProps<TOptions>>;
