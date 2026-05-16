import type { Collection, InternalCollectionDocument } from "@types";
import { FaSolidInfo } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	type JSXElement,
	Show,
} from "solid-js";
import DateText from "@/components/Partials/DateText";
import T from "@/translations";
import helpers from "@/utils/helpers";
import SidebarSection from "./Partials/SidebarSection";

const DetailRow: Component<{
	label: string;
	value?: string | number | null;
	children?: JSXElement;
}> = (props) => (
	<div class="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
		<dt class="text-body">{props.label}</dt>
		<dd class="min-w-0 text-right text-title">
			{props.children ?? props.value}
		</dd>
	</div>
);

export const DocumentDetails: Component<{
	collection: Accessor<Collection | undefined>;
	document: Accessor<InternalCollectionDocument | undefined>;
	documentId: Accessor<number | undefined>;
}> = (props) => {
	// ----------------------------------
	// Memos
	const collectionName = createMemo(() => {
		const collection = props.collection();
		return (
			helpers.getLocaleValue({
				value: collection?.details.name,
				fallback: collection?.key,
			}) || "-"
		);
	});
	const details = createMemo(() => {
		const document = props.document();

		return [
			{
				label: T()("document_id"),
				value: props.documentId() ?? "-",
				show: props.documentId() !== undefined,
			},
			{
				label: T()("collection"),
				value: collectionName(),
				show: true,
			},
			{
				label: T()("status"),
				value: document?.isDeleted
					? T()("deleted")
					: (document?.status ?? T()("unsaved")),
				show: true,
			},
			{
				label: T()("created_by"),
				value: helpers.formatUserName(document?.createdBy, "simple") || "-",
				show: document !== undefined,
			},
			{
				label: T()("updated_by"),
				value: helpers.formatUserName(document?.updatedBy, "simple") || "-",
				show: document !== undefined,
			},
		];
	});

	// ----------------------------------
	// Render
	return (
		<SidebarSection
			title={T()("document_details")}
			icon={<FaSolidInfo size={14} />}
			storageKey="lucid:page-builder-sidebar:document-details-open"
		>
			<div class="rounded-md border border-border bg-card-base p-3">
				<dl class="grid gap-2 text-xs">
					<Show when={props.document()?.createdAt}>
						<DetailRow label={T()("created_at")}>
							<DateText date={props.document()?.createdAt} class="text-xs" />
						</DetailRow>
					</Show>
					<Show when={props.document()?.updatedAt}>
						<DetailRow label={T()("updated_at")}>
							<DateText date={props.document()?.updatedAt} class="text-xs" />
						</DetailRow>
					</Show>
					<For each={details().filter((detail) => detail.show)}>
						{(detail) => (
							<DetailRow label={detail.label} value={detail.value} />
						)}
					</For>
				</dl>
			</div>
		</SidebarSection>
	);
};
