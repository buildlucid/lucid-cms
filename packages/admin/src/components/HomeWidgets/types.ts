import type { Collection } from "@types";
import type { Component } from "solid-js";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";

/** What availability checks can read besides the user's permissions. */
export type HomeWidgetContext = {
	/** Undefined until collections load. */
	collections: Collection[] | undefined;
};

/** A built-in or plugin widget, ready for the Home overview. */
export type HomeWidget = {
	key: string;
	/** Higher priorities come first in the default layout. */
	priority: number;
	label: () => string;
	description: () => string | undefined;
	size: DashboardWidgetSize;
	sizes: readonly DashboardWidgetSize[];
	/** Starts hidden until the user adds it. */
	hidden: boolean;
	available: (context: HomeWidgetContext) => boolean;
	component: Component<{ size: DashboardWidgetSize }>;
};
