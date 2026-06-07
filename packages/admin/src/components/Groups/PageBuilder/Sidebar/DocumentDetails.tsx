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
import UserDisplay from "@/components/Partials/UserDisplay";
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

const UserDetailValue: Component<{
	user: InternalCollectionDocument["createdBy"];
}> = (props) => (
	<Show when={props.user} fallback="-">
		{(user) => (
			<UserDisplay
				user={{
					username:
						user().username ?? user().email ?? T()("media.types.unknown"),
					firstName: user().firstName,
					lastName: user().lastName,
					profilePicture: user().profilePicture,
				}}
				mode="short"
				size="x-small"
				nameFormat="simple"
			/>
		)}
	</Show>
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
				label: T()("common.document.id"),
				value: props.documentId() ?? "-",
				show: props.documentId() !== undefined,
			},
			{
				label: T()("common.collection"),
				value: collectionName(),
				show: true,
			},
			{
				label: T()("common.status"),
				value: document?.isDeleted
					? T()("common.status.deleted")
					: (document?.status ?? T()("common.unsaved")),
				show: true,
			},
		].filter((detail) => detail.show);
	});

	// ----------------------------------
	// Render
	return (
		<SidebarSection
			title={T()("common.document.details")}
			icon={<FaSolidInfo size={14} />}
			storageKey="lucid:page-builder-sidebar:document-details-open"
		>
			<div class="rounded-md border border-border bg-card-base p-3">
				<dl class="grid gap-2 text-xs">
					<Show when={props.document()?.createdAt}>
						<DetailRow label={T()("common.created.at")}>
							<DateText date={props.document()?.createdAt} class="text-xs" />
						</DetailRow>
					</Show>
					<Show when={props.document()?.updatedAt}>
						<DetailRow label={T()("common.updated.at")}>
							<DateText date={props.document()?.updatedAt} class="text-xs" />
						</DetailRow>
					</Show>
					<For each={details()}>
						{(detail) => (
							<DetailRow label={detail.label} value={detail.value} />
						)}
					</For>
					<Show when={props.document() !== undefined}>
						<DetailRow label={T()("common.created.by")}>
							<UserDetailValue user={props.document()?.createdBy ?? null} />
						</DetailRow>
						<DetailRow label={T()("common.updated.by")}>
							<UserDetailValue user={props.document()?.updatedBy ?? null} />
						</DetailRow>
					</Show>
				</dl>
			</div>
		</SidebarSection>
	);
};
