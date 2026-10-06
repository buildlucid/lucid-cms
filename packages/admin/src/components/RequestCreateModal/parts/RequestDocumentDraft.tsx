import type {
	Collection,
	InternalCollectionDocument,
	RequestDocumentInput,
} from "@types";
import { FaSolidXmark } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import Checkbox from "@/components/Checkbox/Checkbox";
import DocumentThumb from "@/components/DocumentThumb/DocumentThumb";
import Select from "@/components/Select/Select";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { getAllowedTargets, getTargetLabel } from "@/utils/requests";

const RequestDocumentDraft: Component<{
	draft: RequestDocumentInput;
	/** The picked document as listed, which carries its label fields and version summary. */
	document: InternalCollectionDocument | undefined;
	collection: Collection | undefined;
	onChange: (draft: RequestDocumentInput) => void;
	onRemove: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() =>
		props.collection && props.document
			? getDocumentPreviewLabel({
					collection: props.collection,
					document: props.document,
					contentLocale: contentLocaleStore.get.contentLocale ?? "",
				})
			: undefined,
	);
	const collectionLabel = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.labels.singular,
				fallback: props.draft.collectionKey,
			}) || props.draft.collectionKey,
	);
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
		<li class="rounded-md border border-border bg-input">
			<div class="flex items-center gap-3 p-2.5">
				<DocumentThumb />
				<div class="min-w-0 grow">
					<Show
						when={label()}
						fallback={<span class="skeleton block h-5 w-32" />}
					>
						<p class="truncate text-sm text-title">{label()}</p>
					</Show>
					<p class="mt-0.5 truncate text-xs text-muted">
						{collectionLabel()} #{props.draft.documentId}
					</p>
				</div>
				<Button
					variant="danger-ghost"
					size="xs"
					shape="square"
					aria-label={T()("requests.create.clear.document")}
					title={T()("requests.create.clear.document")}
					onClick={props.onRemove}
				>
					<FaSolidXmark size={12} />
				</Button>
			</div>
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
								targets: getAllowedTargets(props.collection, value).slice(0, 1),
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
		</li>
	);
};

export default RequestDocumentDraft;
