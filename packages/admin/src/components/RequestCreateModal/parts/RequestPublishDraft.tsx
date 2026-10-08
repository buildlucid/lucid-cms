import type {
	Collection,
	InternalCollectionDocument,
	RequestDocumentInput,
} from "@types";
import { type Component, createMemo, For } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import RequestDocumentDraft from "@/components/RequestDocumentsModal/parts/RequestDocumentDraft";
import Select from "@/components/Select/Select";
import T from "@/translations";
import {
	getAllowedTargets,
	getDefaultTargets,
	getTargetLabel,
} from "@/utils/requests";

const RequestPublishDraft: Component<{
	draft: Required<RequestDocumentInput>;
	/** The picked document as listed, which carries its label fields and version summary. */
	document: InternalCollectionDocument | undefined;
	collection: Collection | undefined;
	onChange: (draft: Required<RequestDocumentInput>) => void;
	onRemove: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	//* environments can only start a request when they have content to move on
	const sources = createMemo(() => [
		{ value: "latest", label: T()("requests.source.latest") },
		...(props.collection?.publishing.targets ?? [])
			.filter(
				(environment) =>
					props.document?.versions[environment.key] &&
					getAllowedTargets(props.collection, environment.key).length > 0,
			)
			.map((environment) => ({
				value: environment.key,
				label: getTargetLabel(props.collection, environment.key),
			})),
	]);
	const allowed = createMemo(() =>
		getAllowedTargets(props.collection, props.draft.source),
	);

	// ----------------------------------------
	// Functions
	const toggleTarget = (target: string, checked: boolean) =>
		props.onChange({
			...props.draft,
			targets: checked
				? allowed().filter(
						(key) => key === target || props.draft.targets.includes(key),
					)
				: props.draft.targets.filter((key) => key !== target),
		});

	// ----------------------------------------
	// Render
	return (
		<RequestDocumentDraft
			draft={props.draft}
			document={props.document}
			collection={props.collection}
			onRemove={props.onRemove}
		>
			<div class="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4">
				<span class="shrink-0 text-xs text-muted sm:w-28">
					{T()("requests.source")}
				</span>
				<div class="min-w-0 grow sm:max-w-56">
					<Select
						id={`request-source-${props.draft.collectionKey}-${props.draft.documentId}`}
						name="source"
						size="sm"
						value={props.draft.source}
						options={sources()}
						onChange={(value) => {
							if (typeof value !== "string") return;
							props.onChange({
								...props.draft,
								source: value,
								targets: getDefaultTargets(props.collection, value),
							});
						}}
					/>
				</div>
			</div>
			<div class="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-start sm:gap-4">
				<span class="shrink-0 text-xs text-muted sm:w-28 sm:pt-2">
					{T()("requests.targets")}
				</span>
				<div class="flex min-w-0 grow flex-wrap gap-2">
					<For each={allowed()}>
						{(target) => (
							<Checkbox
								id={`request-target-${props.draft.collectionKey}-${props.draft.documentId}-${target}`}
								variant="button"
								label={getTargetLabel(props.collection, target)}
								value={props.draft.targets.includes(target)}
								onChange={(checked) => toggleTarget(target, checked)}
							/>
						)}
					</For>
				</div>
			</div>
		</RequestDocumentDraft>
	);
};

export default RequestPublishDraft;
