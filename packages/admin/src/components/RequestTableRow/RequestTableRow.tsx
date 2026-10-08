import type { Collection, RequestSummary } from "@types";
import { type Component, Show } from "solid-js";
import TableSelectionCell from "@/components/Table/parts/TableSelectionCell";
import Table from "@/components/Table/Table";
import TableUserStackCell from "@/components/TableUserStackCell/TableUserStackCell";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getRequestState, requestStates, requestTypes } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";

const RequestTableRow: Component<{
	index: number;
	request: RequestSummary;
	collections: Collection[];
	onClick?: () => void;
	/** Opt-in leading checkbox the host drives itself, under the "select" column. Hides the open action. */
	selection?: {
		selected: boolean;
		onChange: () => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			onClick={props.onClick}
			actions={
				props.selection
					? undefined
					: [
							{
								label: T()("requests.open"),
								type: "link",
								icon: "eye",
								href: getRequestRoute({ requestId: props.request.id }),
							},
						]
			}
		>
			<Show when={props.selection}>
				{(selection) => (
					<TableSelectionCell
						column="select"
						type="td"
						value={selection().selected}
						onChange={selection().onChange}
					/>
				)}
			</Show>
			<Table.Cell column="title" minWidth={280}>
				<div class="min-w-0">
					<p class="truncate text-sm text-title">{props.request.title}</p>
					<p class="truncate text-xs text-body">
						{T()("requests.documents.count", {
							count: props.request.documents.length,
						})}
						{" · "}
						{[
							...new Set(
								props.request.documents.map((document) =>
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
				column="type"
				text={requestTypes[props.request.type].label()}
				variant={requestTypes[props.request.type].pill}
				tooltip={requestTypes[props.request.type].tooltip()}
			/>
			<Table.Pill
				column="status"
				text={requestStates[getRequestState(props.request)].label()}
				variant={requestStates[getRequestState(props.request)].pill}
			/>
			<TableUserStackCell column="reviewers" users={props.request.reviewers} />
			<TableUserStackCell
				column="createdBy"
				users={props.request.createdBy ? [props.request.createdBy] : []}
			/>
			<Table.Date
				column="scheduledAt"
				date={props.request.scheduledAt}
				includeTime={true}
			/>
			<Table.Date column="updatedAt" date={props.request.updatedAt} />
		</Table.Row>
	);
};

export default RequestTableRow;
