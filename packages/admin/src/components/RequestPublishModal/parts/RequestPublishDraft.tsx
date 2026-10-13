import type { RequestDocumentInput } from "@lucidcms/types";
import type { Collection, InternalCollectionDocument } from "@types";
import { type Component, createMemo } from "solid-js";
import RequestDocumentDraft from "@/components/RequestDocumentDraft/RequestDocumentDraft";
import RequestTargetCheckboxes from "@/components/RequestTargetCheckboxes/RequestTargetCheckboxes";
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
	//* Environment sources require saved content before creating a request.
	const sources = createMemo(() => [
		{ value: "latest", label: T()("requests.source.latest") },
		...(props.collection?.publishing.environments ?? [])
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
				<RequestTargetCheckboxes
					id={`request-target-${props.draft.collectionKey}-${props.draft.documentId}`}
					options={allowed()}
					value={props.draft.targets}
					collection={props.collection}
					onChange={(targets) => props.onChange({ ...props.draft, targets })}
				/>
			</div>
		</RequestDocumentDraft>
	);
};

export default RequestPublishDraft;
