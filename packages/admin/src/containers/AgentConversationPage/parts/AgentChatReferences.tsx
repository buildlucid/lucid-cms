import { debounce } from "@solid-primitives/scheduled";
import { A } from "@solidjs/router";
import type { AgentReference } from "@types";
import classnames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import AgentReferenceThumb from "@/components/AgentReferenceFiles/parts/AgentReferenceThumb";
import {
	referenceRemoveClasses,
	referenceRemoveIdleClasses,
} from "@/components/AgentReferenceFiles/remove-classes";
import ViewMediaDrawer from "@/components/ViewMediaDrawer/ViewMediaDrawer";
import api from "@/services/api";
import T, { translateAdminCopy } from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

//* matches `grid-cols-4`; the card only renders in the fixed-width sidebar, so the grid never reflows
const mediaColumns = 4;
const shownMedia = mediaColumns * 2;
const shownDocuments = 4;

/**
 * Revealed on hover or focus, so the list stays quiet until someone reaches for
 * it. Styled like the danger outline button. The first click primes it and the
 * second removes, like brick deletion.
 */
const RemoveButton: Component<{
	label: string;
	class: string;
	onRemove: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [primed, setPrimed] = createSignal(false);

	// ----------------------------------------
	// Memos
	const label = createMemo(() =>
		T()(
			primed() ? "agent.references.unlink.confirm" : "agent.references.unlink",
			{ label: props.label },
		),
	);

	// ----------------------------------------
	// Functions
	const unprime = debounce(() => setPrimed(false), 4000);

	// ----------------------------------------
	// Effects
	onCleanup(() => unprime.clear());

	// ----------------------------------------
	// Render
	return (
		<button
			type="button"
			class={classnames(
				referenceRemoveClasses,
				primed()
					? "border-danger bg-danger-hover text-danger-foreground fill-danger-foreground opacity-100"
					: referenceRemoveIdleClasses,
				props.class,
			)}
			aria-label={label()}
			title={label()}
			onClick={() => {
				if (primed()) {
					unprime.clear();
					setPrimed(false);
					props.onRemove();
					return;
				}
				setPrimed(true);
				unprime();
			}}
		>
			<FaSolidXmark size={9} />
		</button>
	);
};

/** Lists the resources linked to a chat by messages and tools: media as a thumbnail grid, documents as rows. */
const AgentChatReferences: Component<{
	conversationId: string;
	agentKey: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const references = api.agent.useGetReferences({
		id: () => props.conversationId,
	});
	const definitions = api.agent.useGetDefinitions();
	const collections = api.collections.useGetAll({ queryParams: {} });
	const deleteReference = api.agent.useDeleteReference();
	const [mediaId, setMediaId] = createSignal<number>();
	const [showAll, setShowAll] = createSignal(false);

	// ----------------------------------------
	// Memos
	const items = createMemo(() => references.data?.data ?? []);
	const media = createMemo(() =>
		items().filter((reference) => reference.type === "media"),
	);
	const visibleMedia = createMemo(() =>
		showAll() ? media() : media().slice(0, shownMedia),
	);
	const ghostTiles = createMemo(
		() =>
			(mediaColumns - (visibleMedia().length % mediaColumns)) % mediaColumns,
	);
	const documents = createMemo(() =>
		items().flatMap((reference) =>
			reference.type === "document" ? [reference] : [],
		),
	);
	const hidden = createMemo(
		() =>
			Math.max(0, media().length - shownMedia) +
			Math.max(0, documents().length - shownDocuments),
	);
	const toolTitles = createMemo(
		() =>
			new Map(
				definitions.data?.data.agents
					.find((agent) => agent.key === props.agentKey)
					?.tools.map((tool) => [tool.name, translateAdminCopy(tool.title)]) ??
					[],
			),
	);
	const collectionNames = createMemo(
		() =>
			new Map(
				(collections.data?.data ?? []).map((collection) => [
					collection.key,
					helpers.getLocaleValue({
						value: collection.details.labels.singular,
						fallback: collection.key,
					}) || collection.key,
				]),
			),
	);

	// ----------------------------------------
	// Functions
	const sourceLabel = (reference: AgentReference) =>
		reference.source.type === "tool"
			? T()("agent.references.source.tool", {
					tool:
						toolTitles().get(reference.source.toolName) ??
						reference.source.toolName,
				})
			: T()("agent.references.source.message");
	const remove = (reference: AgentReference) =>
		deleteReference.action.mutate({
			conversationId: props.conversationId,
			referenceId: reference.id,
		});
	const documentDetails = (
		document: Extract<AgentReference, { type: "document" }>,
	) =>
		[
			collectionNames().get(document.collectionKey) ?? document.collectionKey,
			document.versionId === undefined
				? undefined
				: T()("agent.references.pinned"),
			sourceLabel(document),
		]
			.filter(Boolean)
			.join(" · ");

	// ----------------------------------------
	// Render
	return (
		<section
			aria-labelledby="agent-chat-references-title"
			class="flex flex-col gap-2 border-t border-border pt-4"
		>
			<h4
				id="agent-chat-references-title"
				class="flex items-baseline justify-between text-xs text-muted"
			>
				{T()("agent.references.title")}
				<Show when={items().length}>
					<span class="tabular-nums">{items().length}</span>
				</Show>
			</h4>
			<Switch>
				<Match when={references.isError}>
					<p class="text-xs text-muted">
						{T()("agent.chat.details.unavailable")}
					</p>
				</Match>
				<Match when={references.isPending}>
					<span class="skeleton block h-16 w-full" />
				</Match>
				<Match when={items().length === 0}>
					<p class="text-xs text-muted">{T()("agent.references.none")}</p>
				</Match>
				<Match when={true}>
					<Show when={media().length}>
						<ul
							class="grid grid-cols-4 gap-1.5"
							aria-label={T()("agent.references.media")}
						>
							<For each={visibleMedia()}>
								{(reference) => (
									<li class="group relative">
										<button
											type="button"
											class="block aspect-square w-full overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary"
											title={`${reference.label} · ${sourceLabel(reference)}`}
											onClick={() => {
												if (reference.type === "media")
													setMediaId(reference.mediaId);
											}}
										>
											<AgentReferenceThumb reference={reference} />
											<span class="sr-only">{reference.label}</span>
										</button>
										<RemoveButton
											label={reference.label}
											class="end-1 top-1"
											onRemove={() => remove(reference)}
										/>
									</li>
								)}
							</For>
							{/* placeholders complete the last row, so a few files do not leave a ragged grid */}
							<For each={Array.from({ length: ghostTiles() })}>
								{() => (
									<li
										aria-hidden="true"
										class="aspect-square rounded-md border border-dashed border-border"
									/>
								)}
							</For>
						</ul>
					</Show>
					<Show when={documents().length}>
						<ul
							class="flex flex-col gap-0.5"
							aria-label={T()("agent.references.documents")}
						>
							<For
								each={
									showAll() ? documents() : documents().slice(0, shownDocuments)
								}
							>
								{(document) => (
									<li class="group relative">
										<A
											href={getDocumentRoute("edit", {
												collectionKey: document.collectionKey,
												documentId: document.documentId,
												versionId: document.versionId,
												version:
													document.versionId === undefined
														? undefined
														: document.version,
											})}
											class="-mx-1.5 flex items-center gap-2.5 rounded-md py-1.5 ps-1.5 pe-8 hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-primary"
										>
											<span class="block h-9 w-7 shrink-0 overflow-hidden rounded border border-border">
												<AgentReferenceThumb reference={document} />
											</span>
											<span class="min-w-0">
												<span class="block truncate text-xs text-title">
													{document.label}
												</span>
												<span class="block truncate text-[11px] text-muted">
													{documentDetails(document)}
												</span>
											</span>
										</A>
										<RemoveButton
											label={document.label}
											class="end-0 top-1/2 -translate-y-1/2"
											onRemove={() => remove(document)}
										/>
									</li>
								)}
							</For>
						</ul>
					</Show>
					<Show when={hidden() > 0}>
						<button
							type="button"
							class="self-start rounded text-[11px] text-muted hover:text-body focus-visible:outline-2 focus-visible:outline-primary"
							aria-expanded={showAll()}
							onClick={() => setShowAll((value) => !value)}
						>
							{showAll()
								? T()("common.show_less")
								: T()("agent.tool.group.show", { count: hidden() })}
						</button>
					</Show>
				</Match>
			</Switch>
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
		</section>
	);
};

export default AgentChatReferences;
