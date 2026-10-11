import type { AgentReference, AgentWidgetPart } from "@types";
import { TbOutlineLink } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import AgentReferenceRow from "@/components/AgentReferenceRow/AgentReferenceRow";
import ViewMediaDrawer from "@/components/ViewMediaDrawer/ViewMediaDrawer";
import api from "@/services/api";
import T from "@/translations";
import {
	agentReferenceKey,
	agentReferenceKind,
} from "@/utils/agent-references";
import { isReferencesData } from "@/utils/agent-tools";
import helpers from "@/utils/helpers";

/** Resolves saved resource identities into each viewer's current readable details where they were linked in the chat, omitting removed references. */
const AgentReferencesV1: Component<{
	conversationId: string;
	widget: AgentWidgetPart;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [mediaId, setMediaId] = createSignal<number>();
	const references = api.agent.useGetReferences({
		id: () => props.conversationId,
	});
	const previews = api.agent.useGetMediaPreviews({
		id: () => props.conversationId,
	});
	const collections = api.collections.useGetAll({ queryParams: {} });

	// ----------------------------------------
	// Memos
	const items = createMemo(() => {
		const data = props.widget.data;
		if (!isReferencesData(data)) return [];
		const linked = new Map(
			(references.data?.data ?? []).map((reference) => [
				agentReferenceKey(reference),
				reference,
			]),
		);
		return data.references.flatMap((reference) => {
			const item = linked.get(agentReferenceKey(reference));
			return item ? [item] : [];
		});
	});

	// ----------------------------------------
	// Functions
	const mediaDetails = (
		reference: Extract<AgentReference, { type: "media" }>,
	) => {
		const media = previews.data?.data.find(
			(item) => item.id === reference.mediaId,
		);
		if (!media) {
			return T()(`agent.references.kind.${agentReferenceKind(reference)}`);
		}

		const size =
			media.type === "image" || media.type === "video"
				? media.meta.width && media.meta.height
					? `${media.meta.width} × ${media.meta.height}`
					: undefined
				: undefined;
		return [
			media.meta.extension.toUpperCase(),
			size,
			helpers.bytesToSize(media.meta.fileSize),
		]
			.filter(Boolean)
			.join(" · ");
	};
	const details = (reference: AgentReference) => {
		switch (reference.type) {
			case "media":
				return mediaDetails(reference);
			case "request":
				return T()("common.request");
			case "document": {
				const collection = collections.data?.data.find(
					(item) => item.key === reference.collectionKey,
				);
				return [
					helpers.getLocaleValue({
						value: collection?.details.labels.singular,
						fallback: reference.collectionKey,
					}),
					reference.versionId === undefined
						? undefined
						: T()("agent.references.pinned"),
				]
					.filter(Boolean)
					.join(" · ");
			}
		}
	};

	// ----------------------------------------
	// Render
	return (
		<Show when={items().length}>
			<section class="rounded-2xl border border-border bg-card">
				<div class="flex items-center gap-2 px-3.5 py-2">
					<TbOutlineLink size={11} class="shrink-0 text-muted" />
					<span class="min-w-0 grow truncate text-xs text-muted">
						{T()("agent.references.added")}
					</span>
					<span class="shrink-0 text-xs text-muted tabular-nums">
						{items().length === 1
							? T()("agent.references.count.one")
							: T()("agent.references.count", { count: items().length })}
					</span>
				</div>
				<ul class="flex flex-col border-t border-border p-1.5">
					<For each={items()}>
						{(reference) => (
							<AgentReferenceRow
								reference={reference}
								details={details(reference)}
								class="pe-1.5"
								onSelect={() => {
									if (reference.type === "media") {
										setMediaId(reference.mediaId);
									}
								}}
							/>
						)}
					</For>
				</ul>
			</section>
			<Show when={mediaId() !== undefined}>
				<ViewMediaDrawer
					id={mediaId}
					state={{
						open: true,
						setOpen: (open) => {
							if (!open) setMediaId(undefined);
						},
						parentFolderId: () => undefined,
					}}
				/>
			</Show>
		</Show>
	);
};

export default AgentReferencesV1;
