import type { AgentReference } from "@types";
import { TbOutlineLock } from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import AgentReferenceRemoveButton from "@/components/AgentReferenceRemoveButton/AgentReferenceRemoveButton";
import AgentReferenceRow from "@/components/AgentReferenceRow/AgentReferenceRow";
import AgentReferenceThumb from "@/components/AgentReferenceThumb/AgentReferenceThumb";
import ViewMediaDrawer from "@/components/ViewMediaDrawer/ViewMediaDrawer";
import api from "@/services/api";
import T, { translateAdminCopy } from "@/translations";
import helpers from "@/utils/helpers";

//* matches `grid-cols-4`; the card only renders in the fixed-width sidebar, so the grid never reflows
const mediaColumns = 4;
const shownMedia = mediaColumns * 2;
const shownRows = 4;

/** Lists a chat's linked media, documents and requests. */
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
		items().flatMap((reference) =>
			reference.type === "media" ? [reference] : [],
		),
	);
	const visibleMedia = createMemo(() =>
		showAll() ? media() : media().slice(0, shownMedia),
	);
	const ghostTiles = createMemo(
		() =>
			(mediaColumns - (visibleMedia().length % mediaColumns)) % mediaColumns,
	);
	const rows = createMemo(() =>
		items().flatMap((reference) =>
			reference.type === "media" ? [] : [reference],
		),
	);
	const hidden = createMemo(
		() =>
			Math.max(0, media().length - shownMedia) +
			Math.max(0, rows().length - shownRows),
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
	const sourceLabel = (reference: AgentReference) => {
		if (reference.source.type === "message") {
			return T()("agent.references.source.message");
		}
		const tool =
			toolTitles().get(reference.source.toolName) ?? reference.source.toolName;
		return reference.managed
			? T()("agent.references.source.managed", { tool })
			: T()("agent.references.source.tool", { tool });
	};
	const unlinkLabels = (label: string) => ({
		label: T()("agent.references.unlink", { label }),
		confirmLabel: T()("agent.references.unlink.confirm", { label }),
	});
	const remove = (reference: AgentReference) =>
		deleteReference.action.mutate({
			conversationId: props.conversationId,
			referenceId: reference.id,
		});
	const rowDetails = (reference: Exclude<AgentReference, { type: "media" }>) =>
		(reference.type === "request"
			? [T()("common.request"), sourceLabel(reference)]
			: [
					collectionNames().get(reference.collectionKey) ??
						reference.collectionKey,
					reference.versionId === undefined
						? undefined
						: T()("agent.references.pinned"),
					sourceLabel(reference),
				]
		)
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
											onClick={() => setMediaId(reference.mediaId)}
										>
											<AgentReferenceThumb reference={reference} />
											<span class="sr-only">{reference.label}</span>
										</button>
										<Show
											when={!reference.managed}
											fallback={
												<span
													role="img"
													class="absolute flex size-5 items-center justify-center rounded border border-border bg-input text-subtitle opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 inset-e-1 top-1"
													aria-label={T()("agent.references.managed", {
														label: reference.label,
													})}
													title={T()("agent.references.managed", {
														label: reference.label,
													})}
												>
													<TbOutlineLock size={10} />
												</span>
											}
										>
											<AgentReferenceRemoveButton
												{...unlinkLabels(reference.label)}
												class="inset-e-1 top-1"
												onRemove={() => remove(reference)}
											/>
										</Show>
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
					<Show when={rows().length}>
						<ul
							class="flex flex-col gap-0.5"
							aria-label={T()("agent.references.documents")}
						>
							<For each={showAll() ? rows() : rows().slice(0, shownRows)}>
								{(reference) => (
									<AgentReferenceRow
										reference={reference}
										details={rowDetails(reference)}
										class="-mx-1.5 w-[calc(100%+0.75rem)] pe-8"
										end={
											<Show
												when={!reference.managed}
												fallback={
													<span
														role="img"
														class="absolute flex size-5 items-center justify-center rounded border border-border bg-input text-subtitle opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 inset-e-0 top-1/2 -translate-y-1/2"
														aria-label={T()("agent.references.managed", {
															label: reference.label,
														})}
														title={T()("agent.references.managed", {
															label: reference.label,
														})}
													>
														<TbOutlineLock size={10} />
													</span>
												}
											>
												<AgentReferenceRemoveButton
													{...unlinkLabels(reference.label)}
													class="inset-e-0 top-1/2 -translate-y-1/2"
													onRemove={() => remove(reference)}
												/>
											</Show>
										}
									/>
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
