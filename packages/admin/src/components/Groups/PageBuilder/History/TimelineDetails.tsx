import T from "@/translations";
import {
	type Component,
	For,
	Show,
	Switch,
	Match,
	createMemo,
	type Accessor,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import type { TimelineItem } from "@/hooks/document/useHistoryState";
import DateText from "@/components/Partials/DateText";
import Pill from "@/components/Partials/Pill";
import Button from "@/components/Partials/Button";
import { getDocumentRoute } from "@/utils/route-helpers";
import type { CollectionResponse } from "@types";

const TimelineDetails: Component<{
	item: TimelineItem;
	revisionName: string;
	onRevisionNameChange: (value: string) => void;
	onRestore: () => void;
	onPromote: () => void;
	collection: Accessor<CollectionResponse | undefined>;
}> = (props) => {
	// ----------------------------------
	// Hooks & State
	const navigate = useNavigate();

	// ----------------------------------
	// Memos
	const environments = createMemo(() => {
		return props.collection()?.config?.environments ?? [];
	});

	// ----------------------------------
	// Handlers
	const getTitle = () => {
		switch (props.item.type) {
			case "latest":
				return T()("latest_revision");
			case "environment":
				return `${props.item.version?.charAt(0).toUpperCase()}${props.item.version?.slice(1)} Version`;
			default:
				return `${T()("revision")} #${props.item.id}`;
		}
	};

	// ----------------------------------
	// Render
	return (
		<div class="space-y-5 bg-card-base p-6 mt-6 mr-6 rounded-lg border border-border">
			<div>
				<div class="flex items-center gap-2 mb-1">
					<Show when={props.item.type === "latest"}>
						<Pill theme="primary" class="text-[10px]">
							{T()("latest_revision")}
						</Pill>
					</Show>
					<Show when={props.item.type === "environment"}>
						<Pill theme="secondary" class="text-[10px] capitalize">
							{props.item.version}
						</Pill>
					</Show>
					<Show when={props.item.type === "revision"}>
						<Pill theme="outline" class="text-[10px]">
							Revision
						</Pill>
					</Show>
				</div>
				<h3 class="text-lg font-semibold text-title">{getTitle()}</h3>
			</div>
			<div class="space-y-3">
				<div>
					<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
						Version ID
					</span>
					<p class="text-sm text-title mt-0.5">#{props.item.id}</p>
				</div>
				<div>
					<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
						{T()("created_at")}
					</span>
					<DateText
						date={props.item.createdAt}
						class="text-sm text-title block mt-0.5"
					/>
				</div>
				<Show when={props.item.contentId}>
					<div>
						<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
							Content ID
						</span>
						<p class="text-title mt-0.5 font-mono text-xs break-all">
							{props.item.contentId}
						</p>
					</div>
				</Show>
				<Show when={props.item.promotedFrom}>
					<div>
						<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
							Promoted From
						</span>
						<p class="text-sm text-title mt-0.5">
							Revision #{props.item.promotedFrom}
						</p>
					</div>
				</Show>
				<Show when={props.item.bricks}>
					<div>
						<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
							Content
						</span>
						<div class="flex items-center gap-2 mt-1">
							<Pill theme="outline">
								{props.item.bricks?.builder?.length ?? 0} {T()("bricks")}
							</Pill>
							<Pill theme="outline">
								{props.item.bricks?.fixed?.length ?? 0} {T()("fixed_bricks")}
							</Pill>
						</div>
					</div>
				</Show>
			</div>
			<div class="border-t border-border" />
			<div>
				<label
					for="revision-name"
					class="text-xs font-medium text-unfocused uppercase tracking-wide block mb-1.5"
				>
					Revision Name
				</label>
				<input
					id="revision-name"
					type="text"
					class="w-full px-3 py-2 text-sm text-title bg-input-base border border-border rounded-md focus:outline-none focus:border-primary-base transition-colors duration-200"
					placeholder="Enter a name for this revision..."
					value={props.revisionName}
					onInput={(e) => props.onRevisionNameChange(e.currentTarget.value)}
				/>
				<p class="text-xs text-body mt-1">
					Add a memorable name to easily identify this revision
				</p>
			</div>
			<div class="space-y-2 pt-2">
				<Button
					theme="border-outline"
					size="medium"
					classes="w-full"
					onClick={() => {
						navigate(
							getDocumentRoute("edit", {
								collectionKey: props.collection()?.key ?? "",
								documentId: props.item.id,
								status: props.item.type,
							}),
						);
					}}
				>
					<svg
						class="w-4 h-4 mr-2"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
						/>
					</svg>
					{T()("view")} Revision
				</Button>
				<Show when={props.item.type === "revision"}>
					<Button
						theme="secondary"
						size="medium"
						classes="w-full"
						onClick={props.onRestore}
					>
						<svg
							class="w-4 h-4 mr-2"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						{T()("restore_revision")}
					</Button>
				</Show>
				<Show when={environments().length > 0}>
					<div class="relative">
						<Button
							theme="primary"
							size="medium"
							classes="w-full"
							onClick={props.onPromote}
						>
							<svg
								class="w-4 h-4 mr-2"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
								/>
							</svg>
							Promote to Environment
						</Button>
					</div>
				</Show>
			</div>
		</div>
	);
};

export default TimelineDetails;
