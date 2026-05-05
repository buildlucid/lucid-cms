import { A, useParams } from "@solidjs/router";
import type { PublishOperationStatus, PublishOperationUser } from "@types";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Textarea } from "@/components/Groups/Form";
import { Confirmation } from "@/components/Groups/Modal";
import { HeaderBar } from "@/components/Groups/PageBuilder";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import Link from "@/components/Partials/Link";
import Pill, { type PillProps } from "@/components/Partials/Pill";
import { useDocumentState } from "@/hooks/document/useDocumentState";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import PublishRequestPreviewPlaceholder from "../../PublishRequests/PreviewPlaceholder";

type DecisionAction = "approve" | "reject" | "cancel";

const formatUser = (user: PublishOperationUser) => {
	const username = user?.username ?? user?.email;
	if (!username) return "-";
	return helpers.formatUserName(
		{
			username,
			firstName: user?.firstName,
			lastName: user?.lastName,
		},
		"username",
	);
};

const statusTheme = (status: PublishOperationStatus): PillProps["theme"] => {
	switch (status) {
		case "pending":
			return "warning-opaque";
		case "approved":
			return "primary-opaque";
		case "rejected":
		case "cancelled":
			return "error-opaque";
		case "superseded":
			return "outline";
	}
};

const statusLabel = (status: PublishOperationStatus) => {
	switch (status) {
		case "pending":
			return T()("pending");
		case "approved":
			return T()("approved");
		case "rejected":
			return T()("rejected");
		case "cancelled":
			return T()("cancelled");
		case "superseded":
			return T()("superseded");
	}
};

const getDecisionTitle = (action?: DecisionAction) => {
	switch (action) {
		case "approve":
			return T()("approve");
		case "reject":
			return T()("reject");
		case "cancel":
			return T()("cancel_request");
		default:
			return T()("confirm");
	}
};

const CollectionsDocumentsPublishRequestDetailRoute: Component = () => {
	// ----------------------------------
	// State / Hooks
	const params = useParams();
	const versionType = createMemo((): "latest" => "latest");
	const versionId = createMemo(() => undefined);
	const requestId = createMemo(() =>
		Number.parseInt(params.publishRequestId ?? "", 10),
	);
	const [decisionOpen, setDecisionOpen] = createSignal(false);
	const [decisionAction, setDecisionAction] = createSignal<DecisionAction>();
	const [decisionComment, setDecisionComment] = createSignal("");
	const [validationError, setValidationError] = createSignal<string>();

	const state = useDocumentState({
		mode: "edit",
		version: versionType,
		versionId,
	});
	const uiState = useDocumentUIState({
		collectionQuery: state.collectionQuery,
		collection: state.collection,
		documentQuery: state.documentQuery,
		document: state.document,
		mode: "history",
		version: versionType,
		versionId,
	});
	const request = api.publishRequests.useGetSingle({
		queryParams: {
			location: {
				id: () => requestId(),
			},
		},
		enabled: () => Number.isFinite(requestId()),
	});
	const decision = api.publishRequests.useDecision({
		onSuccess: () => {
			setDecisionOpen(false);
			setDecisionAction(undefined);
			setDecisionComment("");
			setValidationError(undefined);
		},
	});

	// ----------------------------------
	// Memos
	const data = createMemo(() => request.data?.data);
	const requireDecisionComment = createMemo(
		() =>
			state.collection()?.config.publishRequests?.requireDecisionComment ===
				true && decisionAction() !== "cancel",
	);
	const error = createMemo(
		() => validationError() || decision.errors()?.message,
	);
	const canReviewRequest = createMemo(
		() => data()?.permissions.review === true,
	);
	const canCancelRequest = createMemo(() => {
		const publishRequest = data();
		if (!publishRequest) return false;
		return (
			canReviewRequest() ||
			publishRequest.requestedBy?.id === userStore.get.user?.id
		);
	});

	// ----------------------------------
	// Functions
	const openDecision = (action: DecisionAction) => {
		setDecisionAction(action);
		setDecisionComment("");
		setValidationError(undefined);
		setDecisionOpen(true);
	};
	const listRoute = createMemo(
		() =>
			`/lucid/collections/${state.collectionKey()}/${state.documentId()}/publish-requests`,
	);
	const snapshotRoute = createMemo(() => {
		const publishRequest = data();
		if (!publishRequest) return "#";

		return getDocumentRoute("edit", {
			collectionKey: publishRequest.collectionKey,
			documentId: publishRequest.documentId,
			status: "snapshot",
			versionId: publishRequest.snapshotVersionId,
		});
	});

	// ----------------------------------
	// Render
	return (
		<>
			<Switch>
				<Match when={uiState.isLoading() || request.isLoading}>
					<div class="-mt-4 relative bg-background-base rounded-b-xl border border-border h-36">
						<span class="absolute inset-4 bg-background-hover z-5 skeleton" />
					</div>
					<div class="mt-2 bg-background-base rounded-t-xl border border-border grow overflow-hidden relative">
						<div class="absolute top-4 left-4 bottom-4 right-4 flex flex-col z-10">
							<span class="h-62 w-full skeleton block mb-4" />
							<span class="h-full w-full skeleton block" />
						</div>
					</div>
				</Match>
				<Match when={uiState.isSuccess() && data()}>
					{(publishRequest) => (
						<>
							<HeaderBar
								mode={undefined}
								version={versionType}
								versionId={versionId}
								state={{
									collection: state.collection,
									collectionKey: state.collectionKey,
									collectionName: state.collectionName,
									collectionSingularName: state.collectionSingularName,
									documentID: state.documentId,
									document: state.document,
									ui: uiState,
									showRevisionNavigation: () => true,
								}}
								actions={{}}
							/>
							<div class="mt-2 bg-background-base rounded-t-xl border border-border grow p-4 md:p-6">
								<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
									<div>
										<h2 class="text-base font-semibold text-title">
											{T()("publish_request_detail_route_title", {
												id: publishRequest().id,
											})}
										</h2>
										<p class="mt-1 text-sm text-body">
											{T()("publish_request_detail_route_description", {
												collection: state.collectionName(),
												documentId: publishRequest().documentId,
												target: publishRequest().target,
											})}
										</p>
									</div>
									<A
										href={listRoute()}
										class="text-sm text-primary-base hover:text-primary-hover transition-colors"
									>
										{T()("publish_requests")}
									</A>
								</div>
								<div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
									<section class="border border-border rounded-md bg-card-base overflow-hidden">
										<div class="p-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
											<div class="flex flex-wrap items-center gap-2">
												<h2 class="text-base font-semibold text-title">
													{T()("preview")}
												</h2>
												<Pill theme={statusTheme(publishRequest().status)}>
													{statusLabel(publishRequest().status)}
												</Pill>
												<Show when={publishRequest().isOutdated}>
													<Pill theme="warning-opaque">
														{T()("out_of_sync")}
													</Pill>
												</Show>
												<Show when={!publishRequest().permissions.review}>
													<Pill theme="outline">{T()("locked")}</Pill>
												</Show>
											</div>
											<Link href={snapshotRoute()} theme="primary" size="small">
												{T()("view_snapshot")}
											</Link>
										</div>
										<div class="p-4">
											<p class="text-sm text-body mb-3">
												{publishRequest().isOutdated
													? T()("snapshot_outdated")
													: T()("snapshot_current")}
											</p>
											<PublishRequestPreviewPlaceholder />
										</div>
									</section>
									<aside class="border border-border rounded-md bg-card-base h-max">
										<div class="p-4 border-b border-border">
											<h2 class="text-base font-semibold text-title">
												{T()("request_details")}
											</h2>
										</div>
										<div class="p-4 flex flex-col gap-3 text-sm">
											<DetailRow label={T()("status")}>
												<Pill theme={statusTheme(publishRequest().status)}>
													{statusLabel(publishRequest().status)}
												</Pill>
											</DetailRow>
											<DetailRow label={T()("target")}>
												{publishRequest().target}
											</DetailRow>
											<DetailRow label={T()("requested_by")}>
												{formatUser(publishRequest().requestedBy)}
											</DetailRow>
											<DetailRow label={T()("requested_at")}>
												<DateText date={publishRequest().createdAt} />
											</DetailRow>
											<Show when={publishRequest().decidedBy}>
												<DetailRow label={T()("decided_by")}>
													{formatUser(publishRequest().decidedBy)}
												</DetailRow>
											</Show>
											<Show when={publishRequest().decidedAt}>
												<DetailRow label={T()("updated_at")}>
													<DateText date={publishRequest().decidedAt} />
												</DetailRow>
											</Show>
											<Show when={publishRequest().requestComment}>
												<DetailRow label={T()("comment")}>
													<span class="whitespace-pre-wrap">
														{publishRequest().requestComment}
													</span>
												</DetailRow>
											</Show>
											<Show when={publishRequest().decisionComment}>
												<DetailRow label={T()("decision_comment")}>
													<span class="whitespace-pre-wrap">
														{publishRequest().decisionComment}
													</span>
												</DetailRow>
											</Show>
											<Show when={publishRequest().assignees.length > 0}>
												<DetailRow label={T()("reviewers")}>
													<div class="flex flex-wrap gap-1">
														<For each={publishRequest().assignees}>
															{(assignee) => (
																<Pill theme="outline">
																	{formatUser(assignee.user)}
																</Pill>
															)}
														</For>
													</div>
												</DetailRow>
											</Show>
										</div>
										<Show
											when={
												publishRequest().status === "pending" &&
												(canReviewRequest() || canCancelRequest())
											}
										>
											<div class="p-4 border-t border-border flex flex-wrap gap-2">
												<Show when={canReviewRequest()}>
													<Button
														type="button"
														theme="primary"
														size="small"
														onClick={() => openDecision("approve")}
													>
														{T()("approve")}
													</Button>
													<Button
														type="button"
														theme="danger-outline"
														size="small"
														onClick={() => openDecision("reject")}
													>
														{T()("reject")}
													</Button>
												</Show>
												<Show when={canCancelRequest()}>
													<Button
														type="button"
														theme="border-outline"
														size="small"
														onClick={() => openDecision("cancel")}
													>
														{T()("cancel")}
													</Button>
												</Show>
											</div>
										</Show>
									</aside>
								</div>
							</div>
						</>
					)}
				</Match>
			</Switch>
			<Confirmation
				theme={decisionAction() === "reject" ? "danger" : "primary"}
				state={{
					open: decisionOpen(),
					setOpen: setDecisionOpen,
					isLoading: decision.action.isPending,
					isError: !!error(),
				}}
				copy={{
					title: getDecisionTitle(decisionAction()),
					description: T()("decision_comment_placeholder"),
					error: error(),
				}}
				callbacks={{
					onConfirm: async () => {
						const action = decisionAction();
						const publishRequest = data();
						if (!action || !publishRequest) return;
						if (
							requireDecisionComment() &&
							decisionComment().trim().length === 0
						) {
							setValidationError(T()("publish_request_comment_required"));
							return;
						}
						await decision.action.mutateAsync({
							id: publishRequest.id,
							action,
							body: {
								comment: decisionComment().trim() || undefined,
							},
						});
					},
					onCancel: () => {
						setDecisionOpen(false);
						setDecisionAction(undefined);
						setDecisionComment("");
						setValidationError(undefined);
						decision.reset();
					},
				}}
			>
				<Textarea
					id="document-publish-request-decision-comment"
					name="document-publish-request-decision-comment"
					value={decisionComment()}
					onChange={(value) => {
						setDecisionComment(value);
						setValidationError(undefined);
					}}
					required={requireDecisionComment()}
					rows={4}
					copy={{
						label: T()("comment"),
						placeholder: T()("decision_comment_placeholder"),
					}}
				/>
			</Confirmation>
		</>
	);
};

const DetailRow: Component<{
	label: string;
	children: JSXElement;
}> = (props) => (
	<div class="flex flex-col gap-1">
		<span class="text-xs text-body">{props.label}</span>
		<div class="text-sm text-title">{props.children}</div>
	</div>
);

export default CollectionsDocumentsPublishRequestDetailRoute;
