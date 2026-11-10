import type { IconTypes } from "solid-icons";
import {
	TbOutlineBolt,
	TbOutlineDatabase,
	TbOutlineFile,
	TbOutlineMail,
	TbOutlinePhoto,
	TbOutlineRefresh,
	TbOutlineSearch,
	TbOutlineShare,
	TbOutlineSitemap,
	TbOutlineTool,
	TbOutlineTrash,
	TbOutlineWorld,
} from "solid-icons/tb";
import type { Component, JSXElement } from "solid-js";
import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import RowIcon from "@/components/RowIcon/RowIcon";

/** Icons a maintenance tile can show. */
export type MaintenanceIcon =
	| "tool"
	| "refresh"
	| "trash"
	| "database"
	| "cache"
	| "image"
	| "share"
	| "search"
	| "sitemap"
	| "world"
	| "file"
	| "mail";

const icons = {
	tool: TbOutlineTool,
	refresh: TbOutlineRefresh,
	trash: TbOutlineTrash,
	database: TbOutlineDatabase,
	cache: TbOutlineBolt,
	image: TbOutlinePhoto,
	share: TbOutlineShare,
	search: TbOutlineSearch,
	sitemap: TbOutlineSitemap,
	world: TbOutlineWorld,
	file: TbOutlineFile,
	mail: TbOutlineMail,
} satisfies Record<MaintenanceIcon, IconTypes>;

export interface MaintenanceTileProps {
	icon: MaintenanceIcon;
	title: string;
	description: string;
	/** A short fact about what the action affects, such as how many items it clears. */
	status?: JSXElement;
	/** Usually a small outline button that opens a confirm modal. Use `danger-outline` when the action can't be undone. */
	action: JSXElement;
}

/**
 * A maintenance action on System → Operations: an icon, what the action does, and its button.
 * Plugins render one from a `maintenance.action` slot component.
 *
 * @example
 * ```tsx
 * import { Button, MaintenanceTile } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 * import type { SlotComponent } from "@lucidcms/admin/types";
 * import type rebuildIndexSlot from "./config.js";
 *
 * const RebuildIndex: SlotComponent<typeof rebuildIndexSlot> = () => {
 * 	const { t } = useTranslation();
 *
 * 	return (
 * 		<MaintenanceTile
 * 			icon="search"
 * 			title={t("plugin.search.rebuild.title")}
 * 			description={t("plugin.search.rebuild.description")}
 * 			status={t("plugin.search.rebuild.status", { count: 120 })}
 * 			action={
 * 				<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
 * 					{t("plugin.search.rebuild.action")}
 * 				</Button>
 * 			}
 * 		/>
 * 	);
 * };
 * ```
 */
const MaintenanceTile: Component<MaintenanceTileProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<article class="flex flex-col rounded-md border border-border bg-card p-4">
			<RowIcon>
				<Dynamic component={icons[props.icon]} class="size-4" />
			</RowIcon>
			<h4 class="mt-4 text-sm font-medium">{props.title}</h4>
			<p class="mt-1 grow text-sm">{props.description}</p>
			<div class="mt-4 flex items-center justify-end gap-3 border-t border-border pt-3">
				<Show when={props.status}>
					<span class="mr-auto min-w-0 truncate text-xs text-muted">
						{props.status}
					</span>
				</Show>
				{props.action}
			</div>
		</article>
	);
};

export default MaintenanceTile;
