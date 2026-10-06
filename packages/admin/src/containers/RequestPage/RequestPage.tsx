import { useParams } from "@solidjs/router";
import type { RequestDocument } from "@types";
import { FaSolidPlus } from "solid-icons/fa";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import Modal from "@/components/Modal/Modal";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RequestApproveModal from "@/components/RequestApproveModal/RequestApproveModal";
import RequestCreateModal from "@/components/RequestCreateModal/RequestCreateModal";
import RequestScheduleModal from "@/components/RequestScheduleModal/RequestScheduleModal";
import RequestTitleModal from "@/components/RequestTitleModal/RequestTitleModal";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import { requestDocumentLimit } from "@/constants/requests";
import api from "@/services/api";
import T from "@/translations";
import { RequestActivity } from "./parts/RequestActivity";
import { RequestCommentComposer } from "./parts/RequestCommentComposer";
import { RequestDescription } from "./parts/RequestDescription";
import { RequestDocumentCard } from "./parts/RequestDocumentCard";
import { RequestHeaderActions } from "./parts/RequestHeaderActions";
import { RequestPageSkeleton } from "./parts/RequestPageSkeleton";
import { RequestPublishing } from "./parts/RequestPublishing";
import { RequestReadiness } from "./parts/RequestReadiness";
import { RequestSidebar } from "./parts/RequestSidebar";

const RequestPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams();
	const [approveOpen, setApproveOpen] = createSignal(false);
	const [completeAfterApproval, setCompleteAfterApproval] = createSignal(false);
	const [requestOpen, setRequestOpen] = createSignal(false);
	const [scheduleOpen, setScheduleOpen] = createSignal(false);
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [addOpen, setAddOpen] = createSignal(false);
	const [removing, setRemoving] = createSignal<RequestDocument>();
	const [closeOpen, setCloseOpen] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	const id = createMemo(() => Number(params.requestId) || undefined);
	const requestQuery = api.requests.useGetSingle({
		queryParams: { location: { id } },
		enabled: () => id() !== undefined,
	});
	const collections = api.collections.useGetAll({ queryParams: {} });
	const publish = api.requests.useComplete({
		onSuccess: () => setRequestOpen(false),
	});
	const remove = api.requests.useRemoveDocument({
		onSuccess: () => setRemoving(undefined),
	});
	const close = api.requests.useClose({
		onSuccess: () => setCloseOpen(false),
	});

	// ----------------------------------------
	// Memos
	const storedRequest = createMemo(() => requestQuery.data?.data);
	const execution = api.requests.useGetExecution({
		id,
		jobId: () => storedRequest()?.executionJobId,
	});
	const publishing = createMemo(() => {
		if (publish.action.isPending) return true;
		const request = storedRequest();
		if (request?.status !== "open" || !request.executionJobId) {
			return false;
		}
		const attempt = execution.data?.data;
		if (execution.isSuccess && attempt?.jobId !== request.executionJobId) {
			return false;
		}
		const now = execution.dataUpdatedAt || Date.now();
		if (attempt?.jobId === request.executionJobId) {
			if (attempt.status === "running") return true;
			return (
				attempt.status === "queued" &&
				(!attempt.runAt || new Date(attempt.runAt).getTime() <= now)
			);
		}
		return (
			!request.failure &&
			(!request.scheduledAt || new Date(request.scheduledAt).getTime() <= now)
		);
	});
	const request = createMemo(() => {
		const data = storedRequest();
		if (!data || !publishing()) return data;
		return {
			...data,
			permissions: {
				edit: false,
				approve: false,
				request: false,
				reopen: false,
			},
			documents: data.documents.map((document) => ({
				...document,
				permissions: { edit: false },
			})),
		};
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<Show when={!requestQuery.isLoading} fallback={<RequestPageSkeleton />}>
				<QueryBoundary class="grow" error={requestQuery.isError}>
					<Show when={request()}>
						{(data) => (
							<>
								<PageLayout.Header
									title={data().title}
									description={T()("requests.single.description")}
									actions={
										<RequestHeaderActions
											request={data()}
											publishing={publishing()}
											onApprove={() => {
												setCompleteAfterApproval(false);
												setApproveOpen(true);
											}}
											onApproveAndComplete={() => {
												setCompleteAfterApproval(true);
												setApproveOpen(true);
											}}
											onComplete={() => setRequestOpen(true)}
											onRename={() => setRenameOpen(true)}
											onClose={() => setCloseOpen(true)}
										/>
									}
								/>
								<PageLayout.Body>
									<div class="flex w-full grow flex-col lg:flex-row">
										<div class="flex min-w-0 grow flex-col gap-10 px-4 pt-4 md:px-6 md:pt-6">
											<Show when={publishing()}>
												<RequestPublishing
													request={data()}
													collections={collections.data?.data ?? []}
													status={
														execution.data?.data?.status === "queued"
															? "queued"
															: "running"
													}
												/>
											</Show>
											<RequestDescription request={data()} />
											<Show when={data().status === "open"}>
												<RequestReadiness
													request={data()}
													collections={collections.data?.data ?? []}
												/>
											</Show>
											<section>
												<SectionHeading title={T()("requests.documents")} />
												<div class="grid gap-4">
													<For each={data().documents}>
														{(document) => (
															<RequestDocumentCard
																request={data()}
																document={document}
																collection={collections.data?.data.find(
																	(collection) =>
																		collection.key === document.collectionKey,
																)}
																onRemove={() => setRemoving(document)}
																onRetry={() => setRequestOpen(true)}
															/>
														)}
													</For>
													<Show
														when={
															data().type === "publish" &&
															data().permissions.edit &&
															data().documents.length < requestDocumentLimit
														}
													>
														<button
															type="button"
															class="flex min-h-14 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 text-sm font-medium text-body transition-colors hover:border-primary hover:bg-primary-low focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
															onClick={() => setAddOpen(true)}
														>
															<FaSolidPlus size={12} />
															{T()("requests.documents.add")}
														</button>
													</Show>
												</div>
											</section>
											<RequestActivity
												request={data()}
												collections={collections.data?.data ?? []}
											/>
											<RequestCommentComposer request={data()} />
										</div>
										<RequestSidebar
											request={data()}
											publishing={publishing()}
											onSchedule={() => setScheduleOpen(true)}
										/>
									</div>
								</PageLayout.Body>
								<RequestCreateModal
									open={addOpen()}
									setOpen={setAddOpen}
									request={data()}
								/>
								<Modal.Confirm
									open={removing() !== undefined}
									onOpenChange={(open) => {
										if (!open) setRemoving(undefined);
									}}
									title={T()("requests.documents.remove")}
									description={T()(
										data().approved
											? "requests.documents.remove.approved"
											: "requests.documents.remove.description",
									)}
									confirmLabel={T()("common.remove")}
									confirmVariant="danger"
									loading={remove.action.isPending}
									error={remove.errors()?.message}
									onConfirm={() => {
										const document = removing();
										if (document) {
											remove.action.mutate({
												id: data().id,
												requestDocumentId: document.id,
											});
										}
									}}
								/>
								<RequestApproveModal
									open={approveOpen()}
									setOpen={setApproveOpen}
									requestAfter={completeAfterApproval()}
									request={data()}
								/>
								<RequestScheduleModal
									open={scheduleOpen()}
									setOpen={setScheduleOpen}
									request={data()}
								/>
								<RequestTitleModal
									open={renameOpen()}
									setOpen={setRenameOpen}
									request={data()}
								/>
								<Modal.Confirm
									open={requestOpen()}
									onOpenChange={setRequestOpen}
									title={T()("requests.complete.now.title")}
									description={
										data().scheduledAt
											? T()("requests.complete.now.description.scheduled")
											: T()("requests.complete.now.description")
									}
									confirmLabel={T()("requests.complete.now")}
									confirmVariant="primary"
									loading={publishing()}
									error={publish.errors()?.message}
									onConfirm={() => {
										if (!publishing()) publish.action.mutate({ id: data().id });
									}}
								/>
								<Modal.Confirm
									open={closeOpen()}
									onOpenChange={setCloseOpen}
									title={T()("requests.close.title")}
									description={T()("requests.close.description")}
									confirmLabel={T()("requests.close")}
									loading={close.action.isPending}
									error={close.errors()?.message}
									onConfirm={() => close.action.mutate({ id: data().id })}
								/>
							</>
						)}
					</Show>
				</QueryBoundary>
			</Show>
		</PageLayout.Root>
	);
};

export default RequestPage;
