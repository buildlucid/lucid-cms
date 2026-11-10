import type { JSXElement } from "solid-js";
import { type Component, createMemo, For } from "solid-js";
import { maintenanceSlots } from "virtual:lucid-admin";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import type { MaintenanceGroup } from "@/components/MaintenanceSlots/types";
import { matchSlots } from "@/extensions/match-slots";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	groupMaintenanceTiles,
	type MaintenanceTileGroup,
} from "@/utils/maintenance-groups";

export interface MaintenanceTileEntry {
	key: string;
	/** @default "rebuild" */
	group?: MaintenanceGroup;
	/** Renders the tile, usually a `MaintenanceTile`. */
	render: () => JSXElement;
}

/** The admin's maintenance tiles and plugins' `maintenance.action` slots, in labelled groups. */
const MaintenanceGroups: Component<{ tiles: MaintenanceTileEntry[] }> = (
	props,
) => {
	// ----------------------------------------
	// Memos
	const groups = createMemo(() =>
		groupMaintenanceTiles([
			...props.tiles,
			...matchSlots(maintenanceSlots, {}).map(
				(entry): MaintenanceTileEntry => ({
					key: entry.key,
					group: entry.group,
					render: () => (
						//* `contents` makes the plugin's tile the grid item, so a slot that renders nothing leaves no gap
						<div data-admin-slot={entry.key} class="contents">
							<AdminExtensionBoundary name={entry.key} placement="content">
								<entry.component
									slot={entry.slot}
									key={entry.key}
									options={entry.options}
								/>
							</AdminExtensionBoundary>
						</div>
					),
				}),
			),
		]),
	);

	// ----------------------------------------
	// Functions
	const groupLabel = (group: MaintenanceTileGroup<MaintenanceTileEntry>) => {
		if (group.key === "rebuild") {
			return T()("system.maintenance.group.rebuild");
		}
		if (group.key === "remove") return T()("system.maintenance.group.remove");
		return helpers.getLocaleValue({ value: group.label, fallback: group.key });
	};

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-6">
			<For each={groups()}>
				{(group) => (
					<section>
						<div class="mb-2.5 flex items-center gap-3">
							<h3 class="shrink-0 text-xs font-medium text-subtitle">
								{groupLabel(group)}
							</h3>
							<span aria-hidden="true" class="h-px grow bg-border" />
						</div>
						<div class="grid gap-2 sm:grid-cols-2">
							<For each={group.tiles}>{(tile) => tile.render()}</For>
						</div>
					</section>
				)}
			</For>
		</div>
	);
};

export default MaintenanceGroups;
