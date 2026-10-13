import type { Collection } from "@types";
import { TbOutlineLetterT, TbOutlineTarget } from "solid-icons/tb";
import { type Component, For, Index, Show } from "solid-js";
import { getCollectionNavigationHref } from "@/components/CollectionNavLink/CollectionNavLink";
import Table from "@/components/Table/Table";
import T from "@/translations";
import helpers from "@/utils/helpers";
import EnvironmentStatus, { type EnvironmentCounts } from "./EnvironmentStatus";

export type EnvironmentColumn = {
	key: string;
	label: string;
};

export type EnvironmentRow = {
	collection: Collection;
	total: number;
	/** Keyed by environment, omitting environments that are not published to. */
	environments: Map<string, EnvironmentCounts>;
};

/** Shows collections against environments with links to status-filtered documents and totals when more than one collection is listed. */
const EnvironmentTable: Component<{
	environments: EnvironmentColumn[];
	rows: EnvironmentRow[];
	totals: Map<string, EnvironmentCounts>;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const statusHref = (
		collection: Collection,
		environment: string,
		status: "out-of-sync" | "unpublished",
	) => {
		const params = new URLSearchParams({
			[`filter[envStatus.${environment}]`]: status,
		});
		return `${getCollectionNavigationHref(collection)}?${params.toString()}`;
	};

	// ----------------------------------------
	// Render
	return (
		//* the table's last row border sits under the card's own border
		<div class="overflow-hidden rounded-md border border-border bg-card">
			<Table.Root
				id="review.environments"
				rowCount={props.rows.length + (props.rows.length > 1 ? 1 : 0)}
				columns={[
					{
						key: "collection",
						label: T()("review.environments.collection"),
						icon: <TbOutlineLetterT />,
					},
					...props.environments.map((environment) => ({
						key: environment.key,
						label: environment.label,
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
											{T()("review.environments.documents", {
												count: row().total,
											})}
										</span>
									</Show>
								</div>
							</Table.Cell>
							<For each={props.environments}>
								{(environment) => (
									<Table.Cell column={environment.key} minWidth={200}>
										<Show
											when={row().environments.get(environment.key)}
											fallback={<span class="text-xs text-muted">-</span>}
										>
											{(counts) => (
												<EnvironmentStatus
													counts={counts()}
													single={row().collection.mode === "single"}
													href={(status) =>
														statusHref(
															row().collection,
															environment.key,
															status,
														)
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
								{T()("review.environments.total")}
							</span>
						</Table.Cell>
						<For each={props.environments}>
							{(environment) => (
								<Table.Cell column={environment.key} minWidth={200}>
									<Show when={props.totals.get(environment.key)}>
										{(counts) => <EnvironmentStatus counts={counts()} />}
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

export default EnvironmentTable;
