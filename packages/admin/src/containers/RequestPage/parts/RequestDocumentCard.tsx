import { A } from "@solidjs/router";
import type { Collection, RequestDetail, RequestDocument } from "@types";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidPen,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import Button from "@/components/Button/Button";
import DocumentThumb from "@/components/DocumentThumb/DocumentThumb";
import Link from "@/components/Link/Link";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getRequestDocumentLabel, getTargetLabel } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";
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
	const contentLabel = createMemo(() =>
		props.document.source === "latest" && props.document.permissions.edit
			? T()("requests.document.edit")
			: T()("requests.document.view"),
	);
	const contentHref = createMemo(() =>
		getRequestRoute({ requestId: props.request.id, content: props.document }),
	);

	// ----------------------------------------
	// Render
	return (
		<section id={`request-document-${props.document.id}`} class="scroll-mt-6">
			<div class="rounded-md border border-border bg-card">
				<div class="flex items-center gap-3 p-4">
					<DocumentThumb />
					<div class="min-w-0 grow">
						<A
							href={contentHref()}
							class="inline-flex max-w-full items-center gap-1.5 text-sm text-title underline-offset-2 hover:underline"
						>
							<span class="truncate">
								{getRequestDocumentLabel(props.document, props.collection)}
							</span>
							<FaSolidArrowUpRightFromSquare
								size={10}
								class="shrink-0 text-icon"
							/>
						</A>
						<p class="mt-0.5 truncate text-xs text-muted">
							{collectionLabel()} #{props.document.documentId}
							<span aria-hidden="true"> · </span>
							{props.request.type === "create"
								? T()("requests.document.source.request")
								: props.document.source === "latest"
									? T()("requests.document.source.proposal")
									: T()("requests.document.source.snapshot", {
											source: getTargetLabel(
												props.collection,
												props.document.source,
											),
										})}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						{/* workflow stages gate environments, so they don't apply to requested documents */}
						<Show when={props.request.type === "publish"}>
							<RequestWorkflowStage
								document={props.document}
								collection={props.collection}
							/>
						</Show>
						<Show
							when={
								props.document.versionId !== null ||
								props.document.approvedVersionId !== null
							}
						>
							<Link
								variant="ghost"
								size="xs"
								shape="square"
								href={contentHref()}
								aria-label={contentLabel()}
								title={contentLabel()}
							>
								<FaSolidPen size={10} />
							</Link>
						</Show>
						<Show
							when={
								props.request.permissions.edit &&
								props.request.documents.length > 1
							}
						>
							<Button
								variant="danger-ghost"
								size="xs"
								shape="square"
								aria-label={T()("requests.documents.remove")}
								title={T()("requests.documents.remove")}
								onClick={props.onRemove}
							>
								<FaSolidXmark size={10} />
							</Button>
						</Show>
					</div>
				</div>
				<RequestOverviewRow
					label={
						props.request.type === "create"
							? T()("requests.targets.create")
							: T()("requests.targets")
					}
				>
					<RequestTargets
						request={props.request}
						document={props.document}
						collection={props.collection}
					/>
				</RequestOverviewRow>
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
