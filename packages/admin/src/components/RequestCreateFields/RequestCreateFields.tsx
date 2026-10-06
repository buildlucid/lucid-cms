import type { Collection } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Input from "@/components/Input/Input";
import RequestOverlapNotice from "@/components/RequestOverlapNotice/RequestOverlapNotice";
import Select from "@/components/Select/Select";
import api from "@/services/api";
import T from "@/translations";
import { getAllowedTargets, getTargetLabel } from "@/utils/requests";

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
				collectionKey: () => props.document.collectionKey,
				documentId: () => props.document.documentId,
			},
			perPage: 5,
		},
	});

	// ----------------------------------------
	// Memos
	const allowed = createMemo(() =>
		getAllowedTargets(props.collection, props.source),
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
				<div class="flex flex-wrap gap-2">
					<For each={allowed()}>
						{(target) => (
							<Checkbox
								id={`request-target-${target}`}
								variant="button"
								label={getTargetLabel(props.collection, target)}
								value={props.targets.includes(target)}
								onChange={(checked) =>
									props.onTargetsChange(
										checked
											? allowed().filter(
													(key) =>
														key === target || props.targets.includes(key),
												)
											: props.targets.filter((key) => key !== target),
									)
								}
							/>
						)}
					</For>
				</div>
			</div>
			<Show when={(requests.data?.data.length ?? 0) > 0}>
				<RequestOverlapNotice requests={requests.data?.data ?? []} />
			</Show>
		</div>
	);
};

export default RequestCreateFields;
