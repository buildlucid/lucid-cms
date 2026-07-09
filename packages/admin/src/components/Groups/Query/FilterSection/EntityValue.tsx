import type { DocumentRef, RelationFieldValue } from "@types";
import {
	FaSolidFile,
	FaSolidFileAudio,
	FaSolidFileLines,
	FaSolidFileVideo,
	FaSolidFileZipper,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	Match,
	Show,
	Switch,
} from "solid-js";
import DocumentSelectPanel from "@/components/Panels/Documents/DocumentSelect";
import MediaSelectPanel from "@/components/Panels/Media/MediaSelect";
import UserSelectPanel from "@/components/Panels/User/UserSelect";
import UserDisplay from "@/components/Partials/UserDisplay";
import type { FilterValue } from "@/hooks/useQueryState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import {
	type DocumentFilterField,
	formatRelationFilterValue,
	parseRelationFilterValue,
} from "@/utils/document-filter-fields";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import type {
	MediaRelationRef,
	UserRelationRef,
} from "@/utils/relation-field-helpers";

/** Display refs are session-only - values hydrated from the URL are not
 * refetched and render as `#id` (or `Collection #id` for relations). */
type PickedRef =
	| { type: "user"; ref: UserRelationRef }
	| { type: "media"; ref: MediaRelationRef }
	| { type: "relation"; ref: DocumentRef };

/**
 * Single-select entity value editor for user/media/relation filter fields.
 * Opens the matching selection panel and commits the picked entity's ID -
 * relations commit `collectionKey:id` so collection scoping survives refresh.
 * Filtering against multiple entities is done via additional OR rows.
 */
export const EntityValue: Component<{
	id: string;
	field: DocumentFilterField;
	value: FilterValue;
	onCommit: (value: FilterValue) => void;
	disabled?: boolean;
}> = (props) => {
	const [panelOpen, setPanelOpen] = createSignal(false);
	const [pickedRef, setPickedRef] = createSignal<PickedRef | undefined>();

	// ----------------------------------
	// Queries
	//* target collection configs drive useAsLabel document labels
	const collections = api.collections.useGetAll({
		queryParams: {
			include: {
				fields: true,
			},
		},
		enabled: () => props.field.type === "relation",
	});

	// ----------------------------------
	// Memos
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);
	const collectionsByKey = createMemo(
		() =>
			new Map(
				(collections.data?.data ?? []).map((collection) => [
					collection.key,
					collection,
				]),
			),
	);
	const valueParts = createMemo<
		{ id: number; collectionKey?: string } | undefined
	>(() => {
		if (props.field.type === "relation") {
			return parseRelationFilterValue(props.value);
		}
		const value = props.value;
		if (typeof value === "number") {
			return Number.isInteger(value) ? { id: value } : undefined;
		}
		if (typeof value === "string" && value.trim() !== "") {
			const parsed = Number(value);
			return Number.isNaN(parsed) ? undefined : { id: parsed };
		}
		return undefined;
	});
	const currentId = createMemo(() => valueParts()?.id);
	//* only trust the stored ref while it still matches the committed value
	const activeRef = createMemo(() => {
		const picked = pickedRef();
		const parts = valueParts();
		if (!picked || !parts) return undefined;
		if (picked.type !== props.field.type) return undefined;
		if (picked.ref.id !== parts.id) return undefined;
		if (
			picked.type === "relation" &&
			parts.collectionKey !== undefined &&
			picked.ref.collectionKey !== parts.collectionKey
		) {
			return undefined;
		}
		return picked;
	});
	const activeDocumentRef = createMemo(() => {
		const picked = activeRef();
		return picked?.type === "relation" ? picked.ref : undefined;
	});
	const activeUserRef = createMemo(() => {
		const picked = activeRef();
		return picked?.type === "user" ? picked.ref : undefined;
	});
	const activeMediaRef = createMemo(() => {
		const picked = activeRef();
		return picked?.type === "media" ? picked.ref : undefined;
	});
	const label = createMemo(() => {
		const parts = valueParts();
		if (!parts) return "";

		if (props.field.type === "relation") {
			//* useAsLabel field value, then first suitable field, then
			//* `Collection #id` - a bare `#id` only for legacy plain values
			const document: DocumentRef | undefined =
				activeDocumentRef() ??
				(parts.collectionKey !== undefined
					? { id: parts.id, collectionKey: parts.collectionKey, fields: null }
					: undefined);
			if (!document) return `#${parts.id}`;
			return getDocumentPreviewLabel({
				document,
				collection: collectionsByKey().get(document.collectionKey),
				contentLocale: contentLocale(),
			});
		}
		const user = activeUserRef();
		if (user) return helpers.formatUserName(user, "simple") || `#${parts.id}`;
		const media = activeMediaRef();
		if (media) return mediaLabel(media, contentLocale()) || `#${parts.id}`;
		return `#${parts.id}`;
	});
	const selectCopy = createMemo(() => {
		switch (props.field.type) {
			case "user":
				return T()("filter.section.entity.select.user");
			case "media":
				return T()("filter.section.entity.select.media");
			default:
				return T()("filter.section.entity.select.document");
		}
	});
	//* pre-select the committed document after refresh via a fieldless ref stub
	const documentSelectedRefs = createMemo<DocumentRef[]>(() => {
		const picked = activeDocumentRef();
		if (picked) return [picked];
		const parts = valueParts();
		if (parts?.collectionKey === undefined) return [];
		return [{ id: parts.id, collectionKey: parts.collectionKey, fields: null }];
	});

	// ----------------------------------
	// Functions
	const clearValue = () => {
		setPickedRef(undefined);
		props.onCommit("");
	};
	const commitUserSelection = (selection: {
		value: number[];
		refs: UserRelationRef[];
	}) => {
		const id = selection.value[0];
		if (id === undefined) {
			clearValue();
			return;
		}
		const ref = selection.refs.find((user) => user.id === id);
		if (ref) setPickedRef({ type: "user", ref });
		else if (pickedRef()?.ref.id !== id) setPickedRef(undefined);
		props.onCommit(id);
	};
	const commitMediaSelection = (selection: {
		value: number[];
		refs: MediaRelationRef[];
	}) => {
		const id = selection.value[0];
		if (id === undefined) {
			clearValue();
			return;
		}
		const ref = selection.refs.find((media) => media.id === id);
		if (ref) setPickedRef({ type: "media", ref });
		else if (pickedRef()?.ref.id !== id) setPickedRef(undefined);
		props.onCommit(id);
	};
	const commitDocumentSelection = (selection: {
		value: RelationFieldValue[];
		refs: DocumentRef[];
	}) => {
		const value = selection.value[0];
		if (!value) {
			clearValue();
			return;
		}
		const ref = selection.refs.find(
			(document) =>
				document.id === value.id &&
				document.collectionKey === value.collectionKey,
		);
		if (ref) setPickedRef({ type: "relation", ref });
		props.onCommit(
			formatRelationFilterValue({
				collectionKey: value.collectionKey,
				id: value.id,
			}),
		);
	};

	// ----------------------------------
	// Render
	return (
		<div class="relative w-full">
			<button
				type="button"
				id={props.id}
				class="focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-80 flex items-center gap-2 text-sm text-left pl-3 pr-8 py-2 bg-input-base border border-border h-10 w-full rounded-md focus:border-primary-base duration-200 transition-colors"
				onClick={() => setPanelOpen(true)}
				disabled={props.disabled}
				aria-haspopup="dialog"
				aria-expanded={panelOpen()}
				aria-label={selectCopy()}
			>
				<Show when={activeUserRef()}>
					{(user) => <UserDisplay user={user()} mode="icon" size="x-small" />}
				</Show>
				<Show when={activeMediaRef()}>
					{(media) => <MediaThumb media={media()} />}
				</Show>
				<span
					class={`truncate ${valueParts() !== undefined ? "text-title" : "text-unfocused"}`}
				>
					{label() || selectCopy()}
				</span>
			</button>
			<Show when={currentId() !== undefined && props.disabled !== true}>
				<button
					type="button"
					class="absolute right-2 top-1/2 -translate-y-1/2 text-subtitle hover:text-error-base duration-200 transition-colors"
					onClick={clearValue}
					title={T()("filter.section.entity.clear")}
					aria-label={T()("filter.section.entity.clear")}
				>
					<FaSolidXmark size={14} />
				</button>
			</Show>
			<Switch>
				<Match when={props.field.type === "user"}>
					<UserSelectPanel
						state={{
							open: panelOpen(),
							setOpen: setPanelOpen,
							multiple: false,
							selected:
								currentId() !== undefined ? [currentId() as number] : [],
							selectedRefs: activeUserRef()
								? [activeUserRef() as UserRelationRef]
								: [],
						}}
						callbacks={{
							onSelect: commitUserSelection,
						}}
					/>
				</Match>
				<Match when={props.field.type === "media"}>
					<MediaSelectPanel
						state={{
							open: panelOpen(),
							setOpen: setPanelOpen,
							multiple: false,
							extensions: props.field.mediaExtensions,
							type: props.field.mediaType,
							selected:
								currentId() !== undefined ? [currentId() as number] : [],
							selectedRefs: activeMediaRef()
								? [activeMediaRef() as MediaRelationRef]
								: [],
						}}
						callbacks={{
							onSelect: commitMediaSelection,
						}}
					/>
				</Match>
				<Match when={props.field.type === "relation"}>
					<DocumentSelectPanel
						state={{
							open: panelOpen(),
							setOpen: setPanelOpen,
							multiple: false,
							collectionKeys: props.field.collections,
							selectedRefs: documentSelectedRefs(),
						}}
						callbacks={{
							onSelect: commitDocumentSelection,
						}}
					/>
				</Match>
			</Switch>
		</div>
	);
};

const mediaLabel = (media: MediaRelationRef, contentLocale: string): string => {
	return (
		helpers.getTranslation(media.title, contentLocale) ||
		helpers.formatFileNameTitle(media.fileName) ||
		media.key ||
		""
	);
};

/** Compact thumbnail for the trigger - image preview or a type icon. */
const MediaThumb: Component<{ media: MediaRelationRef }> = (props) => {
	return (
		<span class="h-6 w-6 min-w-6 rounded-sm border border-border overflow-hidden flex items-center justify-center bg-card-base">
			<Switch
				fallback={<FaSolidFile size={11} class="text-icon-base opacity-60" />}
			>
				<Match when={props.media.type === "image"}>
					<img
						src={`${props.media.url}?preset=thumbnail-small&format=webp`}
						alt=""
						class="h-full w-full object-cover"
						loading="lazy"
					/>
				</Match>
				<Match when={props.media.type === "video"}>
					<FaSolidFileVideo size={11} class="text-icon-base opacity-60" />
				</Match>
				<Match when={props.media.type === "audio"}>
					<FaSolidFileAudio size={11} class="text-icon-base opacity-60" />
				</Match>
				<Match when={props.media.type === "document"}>
					<FaSolidFileLines size={11} class="text-icon-base opacity-60" />
				</Match>
				<Match when={props.media.type === "archive"}>
					<FaSolidFileZipper size={11} class="text-icon-base opacity-60" />
				</Match>
			</Switch>
		</span>
	);
};
