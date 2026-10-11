import type { Agent, AgentReferenceInput, DocumentRef } from "@types";
import {
	TbOutlineFileText,
	TbOutlineGitPullRequest,
	TbOutlineLibraryPhoto,
	TbOutlinePhoto,
	TbOutlinePhotoAi,
	TbOutlinePlus,
	TbOutlineUpload,
} from "solid-icons/tb";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import DocumentSelectDrawer from "@/components/DocumentSelectDrawer/DocumentSelectDrawer";
import MediaSelectDrawer from "@/components/MediaSelectDrawer/MediaSelectDrawer";
import Menu from "@/components/Menu/Menu";
import RequestSelectDrawer from "@/components/RequestSelectDrawer/RequestSelectDrawer";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	type AgentReferenceItem,
	agentReferenceItem,
	preserveSelectedDocumentVersions,
	selectedMediaItems,
} from "@/utils/agent-references";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import { composerTriggerClasses } from "../AgentComposer";

/** Adds references, uploads files, or generates images through the provided callbacks. */
const AgentReferenceMenu: Component<{
	features?: Agent["features"];
	references: AgentReferenceItem[];
	disabled?: boolean;
	/** Opens the file picker. Uploads are personal, so they don't need media library access. */
	onUpload?: () => void;
	/** Opens image generation, attaching the accepted image as a personal upload. */
	onGenerate?: () => void;
	onSelect: (
		type: AgentReferenceInput["type"],
		references: AgentReferenceItem[],
	) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [mediaOpen, setMediaOpen] = createSignal(false);
	const [documentsOpen, setDocumentsOpen] = createSignal(false);
	const [requestsOpen, setRequestsOpen] = createSignal(false);
	const collections = api.collections.useGetAll({
		queryParams: { include: { fields: true } },
		enabled: () => props.features?.documents.attach === true,
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
			props.features?.media.attach === true &&
			userStore.get.hasPermission(["media:read"]).all,
	);
	const canDocuments = createMemo(
		() =>
			props.features?.documents.attach === true && collectionKeys().length > 0,
	);
	const canRequests = createMemo(
		() =>
			props.features?.requests.attach === true &&
			userStore.get.hasPermission([Permissions.RequestsRead]).all,
	);
	// ----------------------------------------
	// Functions
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
			<Show
				when={
					props.onUpload ||
					props.onGenerate ||
					canMedia() ||
					canDocuments() ||
					canRequests()
				}
			>
				<Menu.Root placement="top-start">
					<Menu.Trigger
						class={`${composerTriggerClasses} w-7`}
						disabled={props.disabled}
						aria-label={T()("agent.composer.add")}
						title={T()("agent.composer.add")}
					>
						<TbOutlinePlus size={11} />
					</Menu.Trigger>
					<Menu.Content>
						<Show when={props.onUpload || props.onGenerate || canMedia()}>
							<Menu.Sub
								label={T()("agent.references.add.media")}
								icon={<TbOutlinePhoto size={12} />}
							>
								<Show when={canMedia()}>
									<Menu.Item
										icon={<TbOutlineLibraryPhoto size={12} />}
										onSelect={() => setMediaOpen(true)}
									>
										{T()("agent.references.select.media")}
									</Menu.Item>
								</Show>
								<Show when={props.onUpload}>
									{(upload) => (
										<Menu.Item
											icon={<TbOutlineUpload size={12} />}
											onSelect={() => upload()()}
										>
											{T()("agent.uploads.add")}
										</Menu.Item>
									)}
								</Show>
								<Show when={props.onGenerate}>
									{(generate) => (
										<Menu.Item
											icon={<TbOutlinePhotoAi size={12} />}
											onSelect={() => generate()()}
										>
											{T()("agent.uploads.generate")}
										</Menu.Item>
									)}
								</Show>
							</Menu.Sub>
						</Show>
						<Show when={canDocuments()}>
							<Menu.Item
								icon={<TbOutlineFileText size={12} />}
								onSelect={() => setDocumentsOpen(true)}
							>
								{T()("agent.references.add.document")}
							</Menu.Item>
						</Show>
						<Show when={canRequests()}>
							<Menu.Item
								icon={<TbOutlineGitPullRequest size={12} />}
								onSelect={() => setRequestsOpen(true)}
							>
								{T()("agent.references.add.request")}
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
						includePersonal: true,
						selected: props.references.flatMap((reference) =>
							reference.type === "media" ? [reference.mediaId] : [],
						),
					}}
					callbacks={{
						onSelect: (selection) =>
							props.onSelect(
								"media",
								selectedMediaItems(
									props.references,
									selection,
									contentLocaleStore.get.contentLocale,
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
			<Show when={requestsOpen() && canRequests()}>
				<RequestSelectDrawer
					state={{
						open: true,
						setOpen: setRequestsOpen,
						multiple: true,
						selected: props.references.flatMap((reference) =>
							reference.type === "request" ? [reference.requestId] : [],
						),
					}}
					callbacks={{
						onSelect: (selection) =>
							props.onSelect(
								"request",
								selection.value.map((requestId) => {
									const request = selection.refs.find(
										(ref) => ref.id === requestId,
									);
									if (request) {
										return {
											type: "request",
											requestId,
											label: request.title,
										};
									}
									return agentReferenceItem(
										props.references.find(
											(item) =>
												item.type === "request" && item.requestId === requestId,
										) ?? { type: "request", requestId },
									);
								}),
							),
					}}
				/>
			</Show>
		</>
	);
};

export default AgentReferenceMenu;
