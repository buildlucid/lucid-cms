import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import type { HomeWidgetPreference } from "@/store/userPreferencesStore/userPreferencesStore";

type LayoutWidget = {
	key: string;
	size: DashboardWidgetSize;
	sizes: readonly DashboardWidgetSize[];
	hidden: boolean;
};

export type HomeLayoutItem<Widget extends LayoutWidget> = {
	widget: Widget;
	size: DashboardWidgetSize;
	hidden: boolean;
};

/**
 * Applies a saved layout to the widgets the user can see, which arrive in
 * default order. Saved order, sizes and hidden state win. Widgets the user has
 * not placed yet, such as a newly installed plugin's, follow in default order.
 */
export const resolveHomeLayout = <Widget extends LayoutWidget>(
	widgets: readonly Widget[],
	saved: readonly HomeWidgetPreference[] | undefined,
): HomeLayoutItem<Widget>[] => {
	const byKey = new Map(widgets.map((widget) => [widget.key, widget]));
	const placed = (saved ?? []).flatMap((preference) => {
		const widget = byKey.get(preference.key);
		if (!widget) return [];
		return [
			{
				widget,
				size:
					preference.size && widget.sizes.includes(preference.size)
						? preference.size
						: widget.size,
				hidden: preference.hidden ?? widget.hidden,
			},
		];
	});
	const placedKeys = new Set(placed.map((item) => item.widget.key));

	return [
		...placed,
		...widgets
			.filter((widget) => !placedKeys.has(widget.key))
			.map((widget) => ({ widget, size: widget.size, hidden: widget.hidden })),
	];
};
