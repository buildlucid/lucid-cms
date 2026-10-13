import type {
	AgentBuilderChange,
	AgentBuilderChangesData,
} from "@lucidcms/types";
import type { Collection } from "@types";
import classnames from "classnames";
import { TbOutlinePencil } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import {
	type BuilderFocus,
	useAgentSession,
} from "@/hooks/useAgentSession/useAgentSession";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import type { CollectionFieldConfig } from "@/types/collection-config";
import { changeTarget } from "@/utils/agent-builder-changes";
import { showsDocument } from "@/utils/agent-screen";
import helpers from "@/utils/helpers";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";

const shownRows = 8;

const statusLabels = {
	added: "agent.builder.changes.added",
	removed: "agent.builder.changes.removed",
	moved: "agent.builder.changes.moved",
} as const;

type Row = {
	id: string;
	label: string;
	/** Nests brick fields under their brick while leaving document fields at the top level. */
	nested: boolean;
	status?: keyof typeof statusLabels;
	locales: string[];
	/** Where the row links to, unless it's gone or the builder can't show it. */
	target?: BuilderFocus;
};

const brickConfig = (
	collection: Collection | undefined,
	brick: NonNullable<AgentBuilderChange["brick"]>,
) => {
	const configs =
		brick.type === "fixed"
			? collection?.fixedBricks
			: brick.type === "builder"
				? collection?.builderBricks
				: collection?.embeddedBricks;
	return configs?.find((config) => config.key === brick.key);
};

/** A field's label after the labels of the repeaters it sits in, eg. "Links › Label". */
const fieldLabel = (configs: CollectionFieldConfig[], path: string[]) => {
	const labels: string[] = [];
	let scope = configs;
	for (const [index, key] of path.entries()) {
		//* repeater item refs sit between the field keys
		if (index % 2 === 1) continue;
		const config = flattenStructuralScopeConfigs(scope).find(
			(field) => field.key === key,
		);
		labels.push(
			helpers.getLocaleValue({ value: config?.details.label, fallback: key }),
		);
		scope = config?.type === "repeater" ? config.fields : [];
	}
	return labels.join(" › ");
};

/** Lists and links a reply's builder changes, with undo available while that run's edits are the latest steps. */
const AgentBuilderChanges: Component<{
	data: AgentBuilderChangesData;
	/** The run that made the changes, whose steps the card can undo. */
	runId: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();
	const brickStore = useBrickStore();
	const [expanded, setExpanded] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	const collectionQuery = api.collections.useGetSingle({
		queryParams: {
			location: { collectionKey: () => props.data.document.collectionKey },
		},
	});

	// ----------------------------------------
	// Memos
	const rows = createMemo(() => {
		const collection = collectionQuery.data?.data;
		const contentLocale = contentLocaleStore.get.contentLocale;
		return props.data.changes.flatMap((change): Row[] => {
			const brick = change.brick;
			const config = brick ? brickConfig(collection, brick) : undefined;
			const fields = change.fields.map(
				(field): Row => ({
					id: `${brick?.ref ?? ""}:${field.path.join("/")}`,
					label: fieldLabel(
						(brick ? config?.fields : collection?.fields) ?? [],
						field.path,
					),
					nested: brick !== null,
					locales: field.locales,
					target: changeTarget(change, field, contentLocale),
				}),
			);
			if (!brick) return fields;

			return [
				{
					id: brick.ref,
					label: helpers.getLocaleValue({
						value: config?.details.label,
						fallback: brick.key,
					}),
					nested: false,
					status:
						change.status === "changed"
							? change.moved
								? "moved"
								: undefined
							: change.status,
					locales: [],
					target: changeTarget(change),
				},
				...fields,
			];
		});
	});
	const count = createMemo(() =>
		props.data.changes.reduce(
			(total, change) =>
				total +
				(change.status === "changed"
					? change.fields.length + (change.moved ? 1 : 0)
					: 1),
			0,
		),
	);
	const visibleRows = createMemo(() =>
		expanded() ? rows() : rows().slice(0, shownRows),
	);
	/** Whether the next undo step is this run's, in the builder this tab shows for the document. */
	const undoable = createMemo(() => {
		const screen = session.screen.current();
		if (!screen || !showsDocument(screen, props.data.document)) return false;
		if (brickStore.get.locked) return false;
		const next = brickStore.edits.peekUndo();
		return next?.source.type === "agent" && next.source.runId === props.runId;
	});

	// ----------------------------------------
	// Functions
	const show = (row: Row) => {
		if (row.target) session.screen.focus(props.data.document, row.target);
	};
	/** Undoes this run's latest consecutive steps, then reveals its first changed field or brick. */
	const undo = () => {
		while (undoable()) brickStore.edits.undo();

		const change = props.data.changes[0];
		const target =
			change &&
			changeTarget(
				change,
				change.fields[0],
				contentLocaleStore.get.contentLocale,
			);
		if (target) session.screen.focus(props.data.document, target);
	};

	// ----------------------------------------
	// Render
	return (
		<section class="rounded-2xl border border-border bg-card">
			<div class="flex items-center gap-2 px-3.5 py-2">
				<TbOutlinePencil size={11} class="shrink-0 text-muted" />
				<span class="min-w-0 grow truncate text-xs text-muted">
					{T()("agent.builder.changes.title")}
				</span>
				<span class="shrink-0 text-xs text-muted tabular-nums">
					{count() === 1
						? T()("agent.builder.changes.count.one")
						: T()("agent.builder.changes.count", { count: count() })}
				</span>
				<Show when={undoable()}>
					<button
						type="button"
						class="shrink-0 rounded-sm text-xs text-primary underline-offset-2 hover:underline focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
						onClick={undo}
					>
						{T()("agent.builder.changes.undo")}
					</button>
				</Show>
			</div>
			<ul class="flex flex-col border-t border-border p-1.5">
				<For each={visibleRows()}>
					{(row) => (
						<li>
							<button
								type="button"
								disabled={!row.target}
								title={
									row.target ? T()("agent.builder.changes.show") : undefined
								}
								class={classnames(
									"flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-start text-xs transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary enabled:hover:bg-card-hover",
									row.nested ? "ps-5 text-body" : "text-title",
								)}
								onClick={() => show(row)}
							>
								<span class="min-w-0 grow truncate">{row.label}</span>
								<Show when={row.locales.length}>
									<span class="shrink-0 text-muted uppercase">
										{row.locales.join(" · ")}
									</span>
								</Show>
								<Show when={row.status}>
									{(status) => (
										<span
											class={classnames("shrink-0 rounded px-1", {
												"bg-success-low text-success-low-foreground":
													status() === "added",
												"bg-danger-low text-danger-low-foreground":
													status() === "removed",
												"bg-input text-muted": status() === "moved",
											})}
										>
											{T()(statusLabels[status()])}
										</span>
									)}
								</Show>
							</button>
						</li>
					)}
				</For>
			</ul>
			<Show when={rows().length > shownRows}>
				<button
					type="button"
					class="w-full rounded-b-2xl border-t border-border px-3.5 py-2 text-start text-xs text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
					aria-expanded={expanded()}
					onClick={() => setExpanded((value) => !value)}
				>
					{expanded()
						? T()("agent.builder.changes.less")
						: T()("agent.builder.changes.more", {
								count: rows().length - shownRows,
							})}
				</button>
			</Show>
		</section>
	);
};

export default AgentBuilderChanges;
