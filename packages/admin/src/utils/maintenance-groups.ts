import type { ResolvedAdminCopy } from "@lucidcms/types";
import type { MaintenanceGroup } from "@/components/MaintenanceSlots/types";

export interface MaintenanceTileGroup<T> {
	key: string;
	/** Set by the first tile that names its group. */
	label?: string | ResolvedAdminCopy;
	tiles: T[];
}

/** Built-in groups lead and trail; every other group sits between them. */
const groupRank = (key: string) => {
	if (key === "rebuild") return 0;
	if (key === "remove") return 2;
	return 1;
};

/**
 * Groups tiles as Clear and Rebuild, custom groups in appearance order, then Remove. Ungrouped
 * tiles default to Clear and Rebuild.
 */
export const groupMaintenanceTiles = <T extends { group?: MaintenanceGroup }>(
	tiles: readonly T[],
) => {
	const groups = new Map<string, MaintenanceTileGroup<T>>();

	for (const tile of tiles) {
		const group = tile.group ?? "rebuild";
		const key = typeof group === "string" ? group : group.key;
		const label = typeof group === "string" ? undefined : group.label;

		const existing = groups.get(key);
		if (existing) {
			existing.tiles.push(tile);
			existing.label ??= label;
		} else {
			groups.set(key, { key, label, tiles: [tile] });
		}
	}

	return [...groups.values()].toSorted(
		(a, b) => groupRank(a.key) - groupRank(b.key),
	);
};
