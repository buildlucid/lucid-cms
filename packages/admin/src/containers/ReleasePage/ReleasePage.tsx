import { useParams } from "@solidjs/router";
import type { ReleaseDocument } from "@types";
import { FaSolidPlus } from "solid-icons/fa";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import Alert from "@/components/Alert/Alert";
import Modal from "@/components/Modal/Modal";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import ReleaseApproveModal from "@/components/ReleaseApproveModal/ReleaseApproveModal";
import ReleaseCreateModal from "@/components/ReleaseCreateModal/ReleaseCreateModal";
import ReleaseScheduleModal from "@/components/ReleaseScheduleModal/ReleaseScheduleModal";
import ReleaseTitleModal from "@/components/ReleaseTitleModal/ReleaseTitleModal";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import { releaseDocumentLimit } from "@/constants/releases";
import api from "@/services/api";
import T from "@/translations";
import { ReleaseActivity } from "./parts/ReleaseActivity";
import { ReleaseCommentComposer } from "./parts/ReleaseCommentComposer";
import { ReleaseDescription } from "./parts/ReleaseDescription";
import { ReleaseDocumentCard } from "./parts/ReleaseDocumentCard";
import { ReleaseHeaderActions } from "./parts/ReleaseHeaderActions";
import { ReleasePageSkeleton } from "./parts/ReleasePageSkeleton";
import { ReleaseReadiness } from "./parts/ReleaseReadiness";
import { ReleaseSidebar } from "./parts/ReleaseSidebar";

const ReleasePage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams();
	const [approveOpen, setApproveOpen] = createSignal(false);
	const [releaseAfterApproval, setReleaseAfterApproval] = createSignal(false);
	const [releaseOpen, setReleaseOpen] = createSignal(false);
	const [scheduleOpen, setScheduleOpen] = createSignal(false);
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [addOpen, setAddOpen] = createSignal(false);
	const [removing, setRemoving] = createSignal<ReleaseDocument>();
	const [closeOpen, setCloseOpen] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	const id = createMemo(() => Number(params.releaseId) || undefined);
	const releaseQuery = api.releases.useGetSingle({
		queryParams: { location: { id } },
		enabled: () => id() !== undefined,
	});
	const collections = api.collections.useGetAll({ queryParams: {} });
	const publish = api.releases.usePublish({
		onSuccess: () => setReleaseOpen(false),
	});
	const remove = api.releases.useRemoveDocument({
		onSuccess: () => setRemoving(undefined),
	});
	const close = api.releases.useClose({
		onSuccess: () => setCloseOpen(false),
	});

	// ----------------------------------------
	// Memos
	const storedRelease = createMemo(() => releaseQuery.data?.data);
	const execution = api.releases.useGetExecution({
		id,
		jobId: () => storedRelease()?.executionJobId,
	});
	const publishing = createMemo(() => {
		if (publish.action.isPending) return true;
		const release = storedRelease();
		if (release?.status !== "open" || !release.executionJobId) {
			return false;
		}
		const attempt = execution.data?.data;
		if (execution.isSuccess && attempt?.jobId !== release.executionJobId) {
			return false;
		}
		const now = execution.dataUpdatedAt || Date.now();
		if (attempt?.jobId === release.executionJobId) {
			if (attempt.status === "running") return true;
			return (
				attempt.status === "queued" &&
				(!attempt.runAt || new Date(attempt.runAt).getTime() <= now)
			);
		}
		return (
			!release.failure &&
			(!release.scheduledAt || new Date(release.scheduledAt).getTime() <= now)
		);
	});
	const release = createMemo(() => {
		const data = storedRelease();
		if (!data || !publishing()) return data;
		return {
			...data,
			permissions: {
				edit: false,
				approve: false,
				release: false,
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
			<Show when={!releaseQuery.isLoading} fallback={<ReleasePageSkeleton />}>
				<QueryBoundary class="grow" error={releaseQuery.isError}>
					<Show when={release()}>
						{(data) => (
							<>
								<PageLayout.Header
									title={data().title}
									description={T()("releases.single.description")}
									actions={
										<ReleaseHeaderActions
											release={data()}
											publishing={publishing()}
											onApprove={() => {
												setReleaseAfterApproval(false);
												setApproveOpen(true);
											}}
											onApproveAndRelease={() => {
												setReleaseAfterApproval(true);
												setApproveOpen(true);
											}}
											onRelease={() => setReleaseOpen(true)}
											onRename={() => setRenameOpen(true)}
											onClose={() => setCloseOpen(true)}
										/>
									}
								/>
								<PageLayout.Body>
									<div class="flex w-full grow flex-col lg:flex-row">
										<div class="flex min-w-0 grow flex-col gap-10 px-4 pt-4 md:px-6 md:pt-6">
											<Show when={publishing()}>
												<div role="status" aria-live="polite">
													<Alert>
														{T()("releases.publishing.description")}
													</Alert>
												</div>
											</Show>
											<ReleaseDescription release={data()} />
											<Show when={data().status === "open"}>
												<ReleaseReadiness
													release={data()}
													collections={collections.data?.data ?? []}
												/>
											</Show>
											<section>
												<SectionHeading title={T()("releases.documents")} />
												<div class="grid gap-4">
													<For each={data().documents}>
														{(document) => (
															<ReleaseDocumentCard
																release={data()}
																document={document}
																collection={collections.data?.data.find(
																	(collection) =>
																		collection.key === document.collectionKey,
																)}
																onRemove={() => setRemoving(document)}
																onRetry={() => setReleaseOpen(true)}
															/>
														)}
													</For>
													<Show
														when={
															data().permissions.edit &&
															data().documents.length < releaseDocumentLimit
														}
													>
														<button
															type="button"
															class="flex min-h-14 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 text-sm font-medium text-body transition-colors hover:border-primary hover:bg-primary-low focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
															onClick={() => setAddOpen(true)}
														>
															<FaSolidPlus size={12} />
															{T()("releases.documents.add")}
														</button>
													</Show>
												</div>
											</section>
											<ReleaseActivity
												release={data()}
												collections={collections.data?.data ?? []}
											/>
											<ReleaseCommentComposer release={data()} />
										</div>
										<ReleaseSidebar
											release={data()}
											publishing={publishing()}
											onSchedule={() => setScheduleOpen(true)}
										/>
									</div>
								</PageLayout.Body>
								<ReleaseCreateModal
									open={addOpen()}
									setOpen={setAddOpen}
									release={data()}
								/>
								<Modal.Confirm
									open={removing() !== undefined}
									onOpenChange={(open) => {
										if (!open) setRemoving(undefined);
									}}
									title={T()("releases.documents.remove")}
									description={T()(
										data().approved
											? "releases.documents.remove.approved"
											: "releases.documents.remove.description",
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
												releaseDocumentId: document.id,
											});
										}
									}}
								/>
								<ReleaseApproveModal
									open={approveOpen()}
									setOpen={setApproveOpen}
									releaseAfter={releaseAfterApproval()}
									release={data()}
								/>
								<ReleaseScheduleModal
									open={scheduleOpen()}
									setOpen={setScheduleOpen}
									release={data()}
								/>
								<ReleaseTitleModal
									open={renameOpen()}
									setOpen={setRenameOpen}
									release={data()}
								/>
								<Modal.Confirm
									open={releaseOpen()}
									onOpenChange={setReleaseOpen}
									title={T()("releases.release.now.title")}
									description={
										data().scheduledAt
											? T()("releases.release.now.description.scheduled")
											: T()("releases.release.now.description")
									}
									confirmLabel={T()("releases.release.now")}
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
									title={T()("releases.close.title")}
									description={T()("releases.close.description")}
									confirmLabel={T()("releases.close")}
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

export default ReleasePage;
