import type { Collection } from "@lucidcms/types";
import type { AdminRouteNavigation } from "@/extensions/types/navigation";
import type { AdminRoute } from "@/extensions/types/route";

type NavigationItem = { order?: number } & (
	| { kind: "collection"; collection: Collection }
	| {
			kind: "route";
			key: string;
			path: string;
			navigation: AdminRouteNavigation;
	  }
);
export type NavigationGroup = {
	key: string;
	label: AdminRouteNavigation["label"] | null;
	order?: number;
	items: NavigationItem[];
};

/** Keeps explicit orders first and preserves registration order for ties. */
const compareOrder = (a: { order?: number }, b: { order?: number }) => {
	if (a.order === b.order) return 0;
	if (a.order === undefined) return 1;
	if (b.order === undefined) return -1;
	return a.order - b.order;
};

/** Combines visible collections and routes without loading route components. */
export const getNavigationGroups = (options: {
	collections: Collection[];
	routes: Pick<AdminRoute, "key" | "path" | "navigation">[];
	extensionsLabel: string;
}) => {
	const groups = new Map<string, NavigationGroup>();
	const add = (group: Omit<NavigationGroup, "items">, item: NavigationItem) => {
		const existing = groups.get(group.key);
		if (existing) {
			existing.label ??= group.label;
			existing.order ??= group.order;
			existing.items.push(item);
		} else {
			groups.set(group.key, { ...group, items: [item] });
		}
	};

	for (const collection of options.collections) {
		if (!collection.group) continue;
		add(
			{
				key: collection.group.key,
				label: collection.group.label,
				order: collection.group.order ?? undefined,
			},
			{ kind: "collection", collection },
		);
	}
	for (const route of options.routes) {
		const navigation = route.navigation;
		if (!navigation) continue;
		const group =
			typeof navigation.group === "string"
				? { key: navigation.group }
				: (navigation.group ?? {
						key: "extensions",
						label: options.extensionsLabel,
					});
		add(
			{ key: group.key, label: group.label ?? null, order: group.order },
			{
				kind: "route",
				key: route.key,
				path: route.path,
				navigation,
				order: navigation.order,
			},
		);
	}

	return [...groups.values()].sort(compareOrder).map((group) => ({
		...group,
		items: group.items.sort(compareOrder),
	}));
};
