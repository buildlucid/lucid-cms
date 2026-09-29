import type { Agent, AgentReferenceInput, DocumentRef } from "@types";
import { FaSolidFileLines, FaSolidImage, FaSolidPlus } from "solid-icons/fa";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import DocumentSelectDrawer from "@/components/DocumentSelectDrawer/DocumentSelectDrawer";
import MediaSelectDrawer from "@/components/MediaSelectDrawer/MediaSelectDrawer";
import Menu from "@/components/Menu/Menu";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	type AgentReferenceItem,
	agentReferenceItem,
	preserveSelectedDocumentVersions,
} from "@/utils/agent-references";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import mediaUrl from "@/utils/media-url";
import type { MediaRelationRef } from "@/utils/relation-field-helpers";
import { composerTriggerClasses } from "../AgentComposer";

/** Adds existing media and documents to the message. */
const AgentReferenceMenu: Component<{
	attachments?: Agent["attachments"];
	references: AgentReferenceItem[];
	disabled?: boolean;
	onSelect: (
		type: AgentReferenceInput["type"],
		references: AgentReferenceItem[],
	) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [mediaOpen, setMediaOpen] = createSignal(false);
	const [documentsOpen, setDocumentsOpen] = createSignal(false);
	const collections = api.collections.useGetAll({
		queryParams: { include: { fields: true } },
		enabled: () => props.attachments?.documents === true,
	});

	// ----------------------------------------
	// Memos
	const collectionKeys = createMemo(
		() =>
			collections.data?.data
				.filter(
					(collection) =>
						userStore.get.hasPermission([collection.permissions.read]).all,
				)
				.map((collection) => collection.key) ?? [],
	);
	const canMedia = createMemo(
		() =>
			props.attachments?.media === true &&
			userStore.get.hasPermission(["media:read"]).all,
	);
	const canDocuments = createMemo(
		() => props.attachments?.documents === true && collectionKeys().length > 0,
	);
	// ----------------------------------------
	// Functions
	/** A newly selected file brings its details; one already attached keeps its own. */
	const mediaItem = (
		mediaId: number,
		media?: MediaRelationRef,
	): AgentReferenceItem => {
		const existing = props.references.find(
			(reference) =>
				reference.type === "media" && reference.mediaId === mediaId,
		);
		if (!media) {
			return existing ?? agentReferenceItem({ type: "media", mediaId });
		}

		return {
			type: "media",
			mediaId,
			label:
				helpers.getTranslation(
					media.title,
					contentLocaleStore.get.contentLocale,
				) ||
				media.fileName ||
				agentReferenceItem({ type: "media", mediaId }).label,
			...(media.meta.mimeType ? { mimeType: media.meta.mimeType } : {}),
			...(media.type === "image" && media.url
				? { previewUrl: mediaUrl(media, "thumbnail-small") }
				: {}),
		};
	};
	const documentItem = (
		selected: { id: number; collectionKey: string },
		document?: DocumentRef,
	): AgentReferenceItem => {
		const reference = {
			type: "document" as const,
			documentId: selected.id,
			collectionKey: selected.collectionKey,
		};
		if (!document || (document.fields === null && document.route === null)) {
			return agentReferenceItem(
				props.references.find(
					(item) =>
						item.type === "document" &&
						item.documentId === selected.id &&
						item.collectionKey === selected.collectionKey,
				) ?? reference,
			);
		}

		return {
			...reference,
			label: getDocumentPreviewLabel({
				collection: collections.data?.data.find(
					(collection) => collection.key === selected.collectionKey,
				),
				document,
				contentLocale: contentLocaleStore.get.contentLocale ?? "",
			}),
		};
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={canMedia() || canDocuments()}>
				<Menu.Root placement="top-start">
					<Menu.Trigger
						class={`${composerTriggerClasses} w-7`}
						disabled={props.disabled}
						aria-label={T()("agent.composer.add")}
						title={T()("agent.composer.add")}
					>
						<FaSolidPlus size={11} />
					</Menu.Trigger>
					<Menu.Content>
						<Show when={canMedia()}>
							<Menu.Item
								icon={<FaSolidImage size={12} />}
								onSelect={() => setMediaOpen(true)}
							>
								{T()("agent.references.add.media")}
							</Menu.Item>
						</Show>
						<Show when={canDocuments()}>
							<Menu.Item
								icon={<FaSolidFileLines size={12} />}
								onSelect={() => setDocumentsOpen(true)}
							>
								{T()("agent.references.add.document")}
							</Menu.Item>
						</Show>
					</Menu.Content>
				</Menu.Root>
			</Show>
			<Show when={mediaOpen() && canMedia()}>
				<MediaSelectDrawer
					state={{
						open: true,
						setOpen: setMediaOpen,
						multiple: true,
						publicOnly: false,
						selected: props.references.flatMap((reference) =>
							reference.type === "media" ? [reference.mediaId] : [],
						),
					}}
					callbacks={{
						onSelect: (selection) =>
							props.onSelect(
								"media",
								selection.value.map((mediaId) =>
									mediaItem(
										mediaId,
										selection.refs.find((media) => media.id === mediaId),
									),
								),
							),
					}}
				/>
			</Show>
			<Show when={documentsOpen() && canDocuments()}>
				<DocumentSelectDrawer
					state={{
						open: true,
						setOpen: setDocumentsOpen,
						collectionKeys: collectionKeys(),
						multiple: true,
						selectedRefs: props.references.flatMap((reference) =>
							reference.type === "document"
								? [
										{
											id: reference.documentId,
											collectionKey: reference.collectionKey,
											route: null,
											fields: null,
										},
									]
								: [],
						),
						selected: props.references.flatMap((reference) =>
							reference.type === "document"
								? [
										{
											id: reference.documentId,
											collectionKey: reference.collectionKey,
										},
									]
								: [],
						),
					}}
					callbacks={{
						onSelect: (selection) =>
							props.onSelect(
								"document",
								preserveSelectedDocumentVersions(
									props.references,
									selection.value.map((document) =>
										documentItem(
											document,
											selection.refs.find(
												(ref) =>
													ref.id === document.id &&
													ref.collectionKey === document.collectionKey,
											),
										),
									),
								),
							),
					}}
				/>
			</Show>
		</>
	);
};

export default AgentReferenceMenu;
