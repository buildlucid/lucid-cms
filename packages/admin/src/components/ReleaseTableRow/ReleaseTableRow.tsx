import type { Collection, ReleaseSummary } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";
import TableUserStackCell from "@/components/TableUserStackCell/TableUserStackCell";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getReleaseState, releaseStates } from "@/utils/releases";
import { getReleaseRoute } from "@/utils/route-helpers";

const ReleaseTableRow: Component<{
	index: number;
	release: ReleaseSummary;
	collections: Collection[];
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("releases.open"),
					type: "link",
					icon: "eye",
					href: getReleaseRoute({ releaseId: props.release.id }),
				},
			]}
		>
			<Table.Cell column="title" minWidth={280}>
				<div class="min-w-0">
					<p class="truncate text-sm text-title">{props.release.title}</p>
					<p class="truncate text-xs text-body">
						{T()("releases.documents.count", {
							count: props.release.documents.length,
						})}
						{" · "}
						{[
							...new Set(
								props.release.documents.map((document) =>
									helpers.getLocaleValue({
										value: props.collections.find(
											(collection) => collection.key === document.collectionKey,
										)?.details.labels.plural,
										fallback: document.collectionKey,
									}),
								),
							),
						].join(", ")}
					</p>
				</div>
			</Table.Cell>
			<Table.Pill
				column="status"
				text={releaseStates[getReleaseState(props.release)].label()}
				variant={releaseStates[getReleaseState(props.release)].pill}
			/>
			<TableUserStackCell column="reviewers" users={props.release.reviewers} />
			<TableUserStackCell
				column="createdBy"
				users={props.release.createdBy ? [props.release.createdBy] : []}
			/>
			<Table.Date
				column="scheduledAt"
				date={props.release.scheduledAt}
				includeTime={true}
			/>
			<Table.Date column="updatedAt" date={props.release.updatedAt} />
		</Table.Row>
	);
};

export default ReleaseTableRow;
