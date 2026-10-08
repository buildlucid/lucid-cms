import { A } from "@solidjs/router";
import type { Collection, RequestDetail, RequestDocument } from "@types";
import { TbOutlineExternalLink } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import DocumentThumb from "@/components/DocumentThumb/DocumentThumb";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getRequestDocumentLabel, getTargetLabel } from "@/utils/requests";
import { getDocumentRoute, getRequestRoute } from "@/utils/route-helpers";
import { RequestChecks } from "./RequestChecks";
import { RequestOverviewRow } from "./RequestOverviewRow";
import { RequestTargets } from "./RequestTargets";
import { RequestWorkflowStage } from "./RequestWorkflowStage";

export const RequestDocumentCard: Component<{
	request: RequestDetail;
	document: RequestDocument;
	onRemove: () => void;
	onRetry: () => void;
	collection: Collection | undefined;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const collectionLabel = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.labels.singular,
				fallback: props.document.collectionKey,
			}) || props.document.collectionKey,
	);
	const canEdit = createMemo(
		() => props.document.source === "latest" && props.document.permissions.edit,
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
		return source === "latest"
			? T()("requests.document.source.proposal")
			: T()("requests.document.source.snapshot", {
					source: getTargetLabel(props.collection, source),
				});
	});

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
					<RequestOverviewRow
						label={
							props.request.type === "create"
								? T()("requests.targets.create")
								: props.request.type === "unpublish"
									? T()("requests.targets.unpublish")
									: T()("requests.targets")
						}
					>
						<RequestTargets
							request={props.request}
							document={props.document}
							collection={props.collection}
						/>
					</RequestOverviewRow>
				</Show>
				<Show when={props.request.status === "open"}>
					<RequestOverviewRow label={T()("requests.checks.title")}>
						<RequestChecks
							request={props.request}
							document={props.document}
							collection={props.collection}
							onRetry={props.onRetry}
						/>
					</RequestOverviewRow>
				</Show>
			</div>
		</section>
	);
};
