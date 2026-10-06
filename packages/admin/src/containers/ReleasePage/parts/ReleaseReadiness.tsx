import type { Collection, Release } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import DateText from "@/components/DateText/DateText";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getBlockerCopy, getReleaseDocumentLabel } from "@/utils/releases";
import { ReleaseCheckRow } from "./ReleaseCheckRow";

/**
 * Whether the whole release can go out: each document's readiness, linking
 * to its card for details, then comments, release-wide blockers and approval.
 * Only shown while the release is open.
 */
export const ReleaseReadiness: Component<{
	release: Release;
	collections: Collection[];
}> = (props) => {
	// ----------------------------------------
	// Memos
	const collectionFor = (key: string) =>
		props.collections.find((collection) => collection.key === key);
	//* blockers that belong to no document, eg. scheduling
	const releaseBlockers = createMemo(() =>
		props.release.blockers.filter(
			(blocker) => blocker.releaseDocumentId === undefined,
		),
	);
	const approverName = createMemo(() => {
		const user = props.release.approvedBy;
		if (!user) return T()("common.unknown");
		return (
			helpers.formatUserName(user, "name") ||
			user.email ||
			T()("common.unknown")
		);
	});

	// ----------------------------------------
	// Render
	return (
		<section id="release-checks" class="scroll-mt-6">
			<SectionHeading title={T()("releases.checks.title")} />
			<ul class="divide-y divide-border rounded-md border border-border bg-card">
				<For each={props.release.documents}>
					{(document) => (
						<ReleaseCheckRow
							tone={document.blockers.length === 0 ? "success" : "warning"}
							title={getReleaseDocumentLabel(
								document,
								collectionFor(document.collectionKey),
							)}
							description={
								document.blockers.length === 0
									? T()("releases.readiness.document.ready")
									: T()("releases.readiness.document.blocked", {
											count: document.blockers.length,
										})
							}
							href={`#release-document-${document.id}`}
						/>
					)}
				</For>
				<For each={releaseBlockers()}>
					{(blocker) => (
						<ReleaseCheckRow
							tone="warning"
							{...getBlockerCopy(blocker, undefined)}
						/>
					)}
				</For>
				<ReleaseCheckRow
					tone={props.release.openComments === 0 ? "success" : "warning"}
					title={
						props.release.openComments === 0
							? T()("releases.readiness.comments.clear.title")
							: T()("releases.readiness.comments.open.title", {
									count: props.release.openComments,
								})
					}
					description={
						props.release.openComments === 0
							? T()("releases.readiness.comments.clear")
							: T()("releases.readiness.comments.open")
					}
				/>
				<Show
					when={props.release.approved}
					fallback={
						<ReleaseCheckRow
							tone="pending"
							title={T()("releases.checks.approval.title")}
							description={T()("releases.checks.approval")}
						/>
					}
				>
					<ReleaseCheckRow
						tone="success"
						title={T()("releases.checks.approved.title")}
						description={
							<>
								{T()("releases.status.approved.by", { name: approverName() })}
								<span aria-hidden="true"> · </span>
								<DateText date={props.release.approvedAt} class="text-sm" />
							</>
						}
					/>
				</Show>
			</ul>
		</section>
	);
};
