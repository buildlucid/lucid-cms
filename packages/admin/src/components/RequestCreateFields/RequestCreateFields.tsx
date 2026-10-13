import type { Collection } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Input from "@/components/Input/Input";
import RequestOverlapNotice from "@/components/RequestOverlapNotice/RequestOverlapNotice";
import RequestTargetCheckboxes from "@/components/RequestTargetCheckboxes/RequestTargetCheckboxes";
import Select from "@/components/Select/Select";
import api from "@/services/api";
import T from "@/translations";
import { formatRelationFilterValue } from "@/utils/document-filter-fields";
import { getAllowedTargets } from "@/utils/requests";

const RequestCreateFields: Component<{
	collection: Collection | undefined;
	document: { collectionKey: string; documentId: number };
	title: string;
	showTitle?: boolean;
	onTitleChange: (value: string) => void;
	source: string;
	sourceOptions?: Array<{ value: string; label: string }>;
	onSourceChange?: (value: string) => void;
	targets: string[];
	onTargetsChange: (value: string[]) => void;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const requests = api.requests.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "open",
				document: () =>
					formatRelationFilterValue({
						collectionKey: props.document.collectionKey,
						id: props.document.documentId,
					}),
			},
			perPage: 5,
		},
	});

	// ----------------------------------------
	// Memos
	//* only opened from latest in the page builder, where completing into latest changes nothing
	const allowed = createMemo(() =>
		getAllowedTargets(props.collection, props.source).filter(
			(target) => target !== "latest",
		),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="grid gap-4">
			<Show when={props.showTitle !== false}>
				<Input
					id="request-title"
					name="title"
					type="text"
					value={props.title}
					onChange={props.onTitleChange}
					required={true}
					label={T()("requests.title.label")}
				/>
			</Show>
			<Show when={props.sourceOptions}>
				<Select
					id="request-source"
					name="source"
					label={T()("requests.source")}
					value={props.source}
					options={props.sourceOptions ?? []}
					onChange={(value) => {
						if (typeof value === "string") props.onSourceChange?.(value);
					}}
				/>
			</Show>
			<div>
				<FormLabel
					id="request-targets"
					label={T()("requests.targets")}
					theme="basic"
				/>
				<RequestTargetCheckboxes
					id="request-target"
					options={allowed()}
					value={props.targets}
					collection={props.collection}
					onChange={props.onTargetsChange}
				/>
			</div>
			<Show when={requests.data?.meta.total}>
				{(total) => (
					<RequestOverlapNotice
						requests={requests.data?.data ?? []}
						total={total()}
					/>
				)}
			</Show>
		</div>
	);
};

export default RequestCreateFields;
