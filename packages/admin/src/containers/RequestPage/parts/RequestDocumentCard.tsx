import { A } from "@solidjs/router";
import type {
	Collection,
	RequestDetails,
	RequestDocument,
	RequestType,
} from "@types";
import { TbOutlineExternalLink } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import DocumentThumb from "@/components/DocumentThumb/DocumentThumb";
import Modal from "@/components/Modal/Modal";
import { useTargetUpdates } from "@/containers/RequestPage/hooks/useTargetUpdates";
import api from "@/services/api";
import T, { type TranslationKeys } from "@/translations";
import helpers from "@/utils/helpers";
import {
	changesContent,
	getRequestDocumentLabel,
	getTargetLabel,
	isLatestCopy,
} from "@/utils/requests";
import { getDocumentRoute, getRequestRoute } from "@/utils/route-helpers";
import { RequestChecks } from "./RequestChecks";
import { RequestOverviewRow } from "./RequestOverviewRow";
import { RequestTargets } from "./RequestTargets";
import { RequestWorkflowStage } from "./RequestWorkflowStage";

/** The label for each request type's targets row. Delete requests show their own row instead. */
const targetLabelKeys = {
	create: "requests.targets.create",
	update: "requests.targets.update",
	publish: "requests.targets",
	unpublish: "requests.targets.unpublish",
	delete: "requests.targets",
} as const satisfies Record<RequestType, TranslationKeys>;

export const RequestDocumentCard: Component<{
	request: RequestDetails;
	document: RequestDocument;
	onRemove: () => void;
	onRetry: () => void;
	collection: Collection | undefined;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const targets = useTargetUpdates({
		request: () => props.request,
		document: () => props.document,
		collection: () => props.collection,
	});

	// ----------------------------------------
	// Memos
	const collectionLabel = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.labels.singular,
				fallback: props.document.collectionKey,
			}) || props.document.collectionKey,
	);
	//* create and update requests' proposals are edited, while a publish request's copy of latest is only refreshed
	const canEdit = createMemo(
		() =>
			changesContent(props.request.type) &&
			props.document.source === "latest" &&
			props.document.permissions.edit,
	);
	const isCopy = createMemo(() =>
		isLatestCopy(props.request.type, props.document),
	);
	const canRefresh = createMemo(
		() =>
			isCopy() &&
			props.request.status === "open" &&
			props.document.versionId !== null &&
			props.document.permissions.edit,
	);
	//* proposals and copies of latest open side by side with latest, to see what changes
	const compareHref = createMemo(() =>
		props.document.source === "latest" && props.document.versionId !== null
			? `${getRequestRoute({ requestId: props.request.id, content: props.document })}?compare=latest`
			: undefined,
	);
	const canOpen = createMemo(
		() =>
			props.document.deleted !== "permanent" &&
			(props.document.source === null ||
				props.document.versionId !== null ||
				props.document.approvedVersionId !== null),
	);
	const contentLabel = createMemo(() =>
		canEdit() ? T()("requests.document.edit") : T()("requests.document.view"),
	);
	//* unpublish and delete requests capture no content, so they link to the document itself
	const contentHref = createMemo(() =>
		props.document.source === null
			? getDocumentRoute("edit", {
					collectionKey: props.document.collectionKey,
					documentId: props.document.documentId,
				})
			: getRequestRoute({
					requestId: props.request.id,
					content: props.document,
				}),
	);
	const sourceLabel = createMemo(() => {
		const source = props.document.source;
		if (props.request.type === "create") {
			return T()("requests.document.source.request");
		}
		if (source === null) {
			return props.request.type === "delete"
				? T()("requests.document.source.delete")
				: T()("requests.document.source.unpublish");
		}
		if (source === "latest") {
			return isCopy()
				? T()("requests.document.source.copy")
				: T()("requests.document.source.proposal");
		}
		return T()("requests.document.source.snapshot", {
			source: getTargetLabel(props.collection, source),
		});
	});

	// ----------------------------------------
	// Queries & Mutations
	const refresh = api.requests.useRefreshDocument();

	// ----------------------------------------
	// Render
	return (
		<section id={`request-document-${props.document.id}`} class="scroll-mt-6">
			<div class="rounded-md border border-border bg-card">
				<div class="group/document flex items-center gap-3 p-4">
					<DocumentThumb />
					<div class="min-w-0 grow">
						<Show
							when={canOpen()}
							fallback={
								<p class="truncate text-sm text-title">
									{getRequestDocumentLabel(props.document, props.collection)}
								</p>
							}
						>
							<A
								href={contentHref()}
								class="inline-flex max-w-full items-center gap-1.5 text-sm text-title underline-offset-2 hover:underline"
							>
								<span class="truncate">
									{getRequestDocumentLabel(props.document, props.collection)}
								</span>
								<TbOutlineExternalLink size={10} class="shrink-0 text-icon" />
							</A>
						</Show>
						<p class="mt-0.5 truncate text-xs text-muted">
							{collectionLabel()} #{props.document.documentId}
							<span aria-hidden="true"> · </span>
							{sourceLabel()}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						<div class="transition-opacity md:opacity-0 md:group-hover/document:opacity-100 md:focus-within:opacity-100 md:has-data-expanded:opacity-100">
							<ActionMenu
								variant="ghost"
								orientation="horizontal"
								placement="bottom-end"
								actions={[
									{
										label: contentLabel(),
										type: "link",
										icon: canEdit() ? "pen" : "eye",
										href: contentHref(),
										show: canOpen(),
									},
									{
										label: T()("requests.document.compare"),
										type: "link",
										icon: "columns",
										href: compareHref() ?? "",
										show: compareHref() !== undefined && canOpen(),
									},
									{
										label: T()("requests.document.refresh"),
										type: "button",
										icon: "rotate",
										show: canRefresh(),
										loading: refresh.action.isPending,
										onClick: () =>
											refresh.action.mutate({
												id: props.request.id,
												requestDocumentId: props.document.id,
											}),
									},
									{
										label: T()("requests.documents.remove"),
										type: "button",
										icon: "trash",
										variant: "danger",
										show:
											props.request.permissions.edit &&
											props.request.documents.length > 1,
										onClick: props.onRemove,
									},
								]}
							/>
						</div>
						<RequestWorkflowStage
							document={props.document}
							collection={props.collection}
						/>
					</div>
				</div>
				<Show
					when={props.request.type !== "delete"}
					fallback={
						<RequestOverviewRow label={T()("requests.targets.delete")}>
							<p class="text-sm text-muted">
								{T()("requests.targets.delete.description")}
							</p>
						</RequestOverviewRow>
					}
				>
					<RequestOverviewRow label={T()(targetLabelKeys[props.request.type])}>
						<RequestTargets
							request={props.request}
							document={props.document}
							collection={props.collection}
							targets={targets}
						/>
					</RequestOverviewRow>
				</Show>
				<Show when={props.request.status === "open"}>
					<RequestOverviewRow label={T()("requests.checks.title")}>
						<RequestChecks
							request={props.request}
							document={props.document}
							collection={props.collection}
							targets={targets}
							onRetry={props.onRetry}
						/>
					</RequestOverviewRow>
				</Show>
			</div>
			<Modal.Confirm
				open={targets.pending() !== undefined}
				onOpenChange={(open) => {
					if (!open) targets.cancel();
				}}
				title={T()("requests.targets.change.title")}
				description={T()("requests.targets.change.description")}
				confirmLabel={T()("common.save")}
				confirmVariant="primary"
				loading={targets.update.action.isPending}
				error={targets.update.errors()?.message}
				onConfirm={targets.confirm}
			/>
		</section>
	);
};
