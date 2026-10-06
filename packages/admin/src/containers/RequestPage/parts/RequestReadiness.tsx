import type { Collection, RequestDetail } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import DateText from "@/components/DateText/DateText";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getBlockerCopy, getRequestDocumentLabel } from "@/utils/requests";
import { RequestCheckRow } from "./RequestCheckRow";

/**
 * Whether the whole request can go out: each document's readiness, linking
 * to its card for details, then comments, request-wide blockers and approval.
 * Only shown while the request is open.
 */
export const RequestReadiness: Component<{
	request: RequestDetail;
	collections: Collection[];
}> = (props) => {
	// ----------------------------------------
	// Memos
	const collectionFor = (key: string) =>
		props.collections.find((collection) => collection.key === key);
	//* blockers that belong to no document, eg. scheduling
	const requestBlockers = createMemo(() =>
		props.request.blockers.filter(
			(blocker) => blocker.requestDocumentId === undefined,
		),
	);
	const approverName = createMemo(() => {
		const user = props.request.approvedBy;
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
		<section id="request-checks" class="scroll-mt-6">
			<SectionHeading title={T()("requests.checks.title")} />
			<ul class="divide-y divide-border rounded-md border border-border bg-card">
				<For each={props.request.documents}>
					{(document) => (
						<RequestCheckRow
							tone={document.blockers.length === 0 ? "success" : "warning"}
							title={getRequestDocumentLabel(
								document,
								collectionFor(document.collectionKey),
							)}
							description={
								document.blockers.length === 0
									? T()("requests.readiness.document.ready")
									: T()("requests.readiness.document.blocked", {
											count: document.blockers.length,
										})
							}
							href={`#request-document-${document.id}`}
						/>
					)}
				</For>
				<For each={requestBlockers()}>
					{(blocker) => (
						<RequestCheckRow
							tone="warning"
							{...getBlockerCopy(blocker, undefined)}
						/>
					)}
				</For>
				<RequestCheckRow
					tone={props.request.openComments === 0 ? "success" : "warning"}
					title={
						props.request.openComments === 0
							? T()("requests.readiness.comments.clear.title")
							: T()("requests.readiness.comments.open.title", {
									count: props.request.openComments,
								})
					}
					description={
						props.request.openComments === 0
							? T()("requests.readiness.comments.clear")
							: T()("requests.readiness.comments.open")
					}
				/>
				<Show
					when={props.request.approved}
					fallback={
						<RequestCheckRow
							tone="pending"
							title={T()("requests.checks.approval.title")}
							description={T()("requests.checks.approval")}
						/>
					}
				>
					<RequestCheckRow
						tone="success"
						title={T()("requests.checks.approved.title")}
						description={
							<>
								{T()("requests.status.approved.by", { name: approverName() })}
								<span aria-hidden="true"> · </span>
								<DateText date={props.request.approvedAt} class="text-sm" />
							</>
						}
					/>
				</Show>
			</ul>
		</section>
	);
};
