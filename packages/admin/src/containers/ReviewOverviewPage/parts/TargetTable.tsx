import type { Collection } from "@types";
import { TbOutlineLetterT, TbOutlineTarget } from "solid-icons/tb";
import { type Component, For, Index, Show } from "solid-js";
import { getCollectionNavigationHref } from "@/components/CollectionNavLink/CollectionNavLink";
import Table from "@/components/Table/Table";
import T from "@/translations";
import helpers from "@/utils/helpers";
import TargetStatus, { type TargetCounts } from "./TargetStatus";

export type TargetColumn = {
	key: string;
	label: string;
};

export type TargetRow = {
	collection: Collection;
	total: number;
	/** Keyed by target. Missing targets aren't published to. */
	targets: Map<string, TargetCounts>;
};

/**
 * Every collection against every publish target, with a totals row when there
 * is more than one collection. Counts link to the collection, filtered to the
 * documents with that status.
 */
const TargetTable: Component<{
	targets: TargetColumn[];
	rows: TargetRow[];
	totals: Map<string, TargetCounts>;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const statusHref = (
		collection: Collection,
		target: string,
		status: "out-of-sync" | "unreleased",
	) => {
		const params = new URLSearchParams({
			[`filter[envStatus.${target}]`]: status,
		});
		return `${getCollectionNavigationHref(collection)}?${params.toString()}`;
	};

	// ----------------------------------------
	// Render
	return (
		//* the table's last row border sits under the card's own border
		<div class="overflow-hidden rounded-md border border-border bg-card">
			<Table.Root
				id="review.targets"
				rowCount={props.rows.length + (props.rows.length > 1 ? 1 : 0)}
				columns={[
					{
						key: "collection",
						label: T()("review.targets.collection"),
						icon: <TbOutlineLetterT />,
					},
					...props.targets.map((target) => ({
						key: target.key,
						label: target.label,
						icon: <TbOutlineTarget />,
					})),
				]}
				padding="sm"
				variant="secondary"
				class="-mb-px"
			>
				<Index each={props.rows}>
					{(row, index) => (
						<Table.Row
							index={index}
							actions={[
								{
									label: T()("common.open"),
									type: "link",
									icon: "eye",
									href: getCollectionNavigationHref(row().collection),
								},
							]}
						>
							<Table.Cell column="collection" minWidth={200}>
								<div class="flex min-w-0 flex-col">
									<span class="truncate text-sm text-title">
										{helpers.getLocaleValue({
											value: row().collection.details.labels.plural,
											fallback: row().collection.key,
										}) || row().collection.key}
									</span>
									<Show when={row().collection.mode === "multiple"}>
										<span class="text-xs text-muted">
											{T()("review.targets.documents", {
												count: row().total,
											})}
										</span>
									</Show>
								</div>
							</Table.Cell>
							<For each={props.targets}>
								{(target) => (
									<Table.Cell column={target.key} minWidth={200}>
										<Show
											when={row().targets.get(target.key)}
											fallback={<span class="text-xs text-muted">-</span>}
										>
											{(counts) => (
												<TargetStatus
													counts={counts()}
													single={row().collection.mode === "single"}
													href={(status) =>
														statusHref(row().collection, target.key, status)
													}
												/>
											)}
										</Show>
									</Table.Cell>
								)}
							</For>
						</Table.Row>
					)}
				</Index>
				<Show when={props.rows.length > 1}>
					<Table.Row index={props.rows.length}>
						<Table.Cell column="collection" minWidth={200}>
							<span class="text-sm text-title">
								{T()("review.targets.total")}
							</span>
						</Table.Cell>
						<For each={props.targets}>
							{(target) => (
								<Table.Cell column={target.key} minWidth={200}>
									<Show when={props.totals.get(target.key)}>
										{(counts) => <TargetStatus counts={counts()} />}
									</Show>
								</Table.Cell>
							)}
						</For>
					</Table.Row>
				</Show>
			</Table.Root>
		</div>
	);
};

export default TargetTable;
