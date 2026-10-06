import { A } from "@solidjs/router";
import type { Collection, Release, ReleaseDocument } from "@types";
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
import { getReleaseDocumentLabel, getTargetLabel } from "@/utils/releases";
import { getReleaseRoute } from "@/utils/route-helpers";
import { ReleaseChecks } from "./ReleaseChecks";
import { ReleaseOverviewRow } from "./ReleaseOverviewRow";
import { ReleaseTargets } from "./ReleaseTargets";
import { ReleaseWorkflowStage } from "./ReleaseWorkflowStage";

export const ReleaseDocumentCard: Component<{
	release: Release;
	document: ReleaseDocument;
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
			? T()("releases.document.edit")
			: T()("releases.document.view"),
	);
	const contentHref = createMemo(() =>
		getReleaseRoute({ releaseId: props.release.id, content: props.document }),
	);

	// ----------------------------------------
	// Render
	return (
		<section id={`release-document-${props.document.id}`} class="scroll-mt-6">
			<div class="rounded-md border border-border bg-card">
				<div class="flex items-center gap-3 p-4">
					<DocumentThumb />
					<div class="min-w-0 grow">
						<A
							href={contentHref()}
							class="inline-flex max-w-full items-center gap-1.5 text-sm text-title underline-offset-2 hover:underline"
						>
							<span class="truncate">
								{getReleaseDocumentLabel(props.document, props.collection)}
							</span>
							<FaSolidArrowUpRightFromSquare
								size={10}
								class="shrink-0 text-icon"
							/>
						</A>
						<p class="mt-0.5 truncate text-xs text-muted">
							{collectionLabel()} #{props.document.documentId}
							<span aria-hidden="true"> · </span>
							{props.release.type === "create"
								? T()("releases.document.source.request")
								: props.document.source === "latest"
									? T()("releases.document.source.proposal")
									: T()("releases.document.source.snapshot", {
											source: getTargetLabel(
												props.collection,
												props.document.source,
											),
										})}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						{/* workflow stages gate environments, so they don't apply to requested documents */}
						<Show when={props.release.type === "publish"}>
							<ReleaseWorkflowStage
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
								props.release.permissions.edit &&
								props.release.documents.length > 1
							}
						>
							<Button
								variant="danger-ghost"
								size="xs"
								shape="square"
								aria-label={T()("releases.documents.remove")}
								title={T()("releases.documents.remove")}
								onClick={props.onRemove}
							>
								<FaSolidXmark size={10} />
							</Button>
						</Show>
					</div>
				</div>
				<ReleaseOverviewRow label={T()("releases.targets")}>
					<ReleaseTargets
						release={props.release}
						document={props.document}
						collection={props.collection}
					/>
				</ReleaseOverviewRow>
				<Show when={props.release.status === "open"}>
					<ReleaseOverviewRow label={T()("releases.checks.title")}>
						<ReleaseChecks
							release={props.release}
							document={props.document}
							collection={props.collection}
							onRetry={props.onRetry}
						/>
					</ReleaseOverviewRow>
				</Show>
			</div>
		</section>
	);
};
