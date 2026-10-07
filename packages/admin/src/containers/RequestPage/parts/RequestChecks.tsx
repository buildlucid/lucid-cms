import type {
	Collection,
	RequestBlocker,
	RequestDetail,
	RequestDocument,
} from "@types";
import {
	type Component,
	createMemo,
	For,
	type JSXElement,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Checkbox from "@/components/Checkbox/Checkbox";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import api from "@/services/api";
import T from "@/translations";
import {
	getAllowedTargets,
	getBlockerCopy,
	getTargetLabel,
} from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";
import { RequestCheckRow } from "./RequestCheckRow";

/**
 * One document's checks, grouped by environment: anything blocking it, its
 * workflow stage, and publishes by someone else to acknowledge after
 * comparing. A failed request attempt for the document comes first, with a
 * retry. Only shown while the request is open.
 */
export const RequestChecks: Component<{
	request: RequestDetail;
	document: RequestDocument;
	collection: Collection | undefined;
	onRetry: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const update = api.requests.useUpdateTargets();
	const review = api.requests.useReviewTarget();

	// ----------------------------------------
	// Memos
	const failed = createMemo(
		() =>
			props.request.failure !== null &&
			props.request.failureRequestDocumentId === props.document.id,
	);
	//* blockers about the whole request, shown before the per-environment groups
	const requestBlockers = createMemo(() =>
		props.document.blockers.filter((blocker) => blocker.target === undefined),
	);
	//* the workflow stage can only be checked once the document itself is usable
	const workflowCheckable = createMemo(
		() =>
			props.document.workflowStage !== null &&
			!props.document.blockers.some((blocker) =>
				[
					"collection_unavailable",
					"migration_required",
					"document_deleted",
				].includes(blocker.code),
			),
	);
	//* each environment's checks together: its blockers, workflow stage, then other publishes
	const groups = createMemo(() =>
		props.document.targets.map((target) => {
			const blockers = props.document.blockers.filter(
				(blocker) => blocker.target === target.target,
			);
			const unavailable = blockers.some(
				(blocker) => blocker.code === "target_unavailable",
			);
			return {
				target,
				label: getTargetLabel(props.collection, target.target),
				//* workflow and review blockers have their own rows
				blockers: blockers.filter(
					(blocker) =>
						blocker.code !== "workflow" && blocker.code !== "review_required",
				),
				workflowAllowed:
					workflowCheckable() && !unavailable
						? !blockers.some((blocker) => blocker.code === "workflow")
						: undefined,
			};
		}),
	);

	const hasChecks = createMemo(
		() =>
			failed() ||
			requestBlockers().length > 0 ||
			groups().some(
				(group) =>
					group.blockers.length > 0 ||
					group.workflowAllowed !== undefined ||
					group.target.changedSinceCreation,
			),
	);

	// ----------------------------------------
	// Functions
	const addTarget = (target: string) => {
		const selected = props.document.targets.map((other) => other.target);
		update.action.mutate({
			id: props.request.id,
			requestDocumentId: props.document.id,
			body: {
				targets: getAllowedTargets(
					props.collection,
					props.document.source,
				).filter((key) => key === target || selected.includes(key)),
			},
		});
	};
	//* only proposals open side by side, as snapshots are fixed
	const compareHref = (target: string) =>
		props.document.source === "latest"
			? `${getRequestRoute({ requestId: props.request.id, content: props.document })}?compare=${encodeURIComponent(target)}`
			: undefined;
	const fixFor = (blocker: RequestBlocker): JSXElement => {
		const required = blocker.required;
		if (
			blocker.code === "prerequisite" &&
			required &&
			props.request.permissions.edit &&
			getAllowedTargets(props.collection, props.document.source).includes(
				required,
			)
		) {
			return (
				<Button
					variant="outline"
					size="sm"
					loading={update.action.isPending}
					onClick={() => addTarget(required)}
				>
					{T()("requests.checks.add.target", {
						target: getTargetLabel(props.collection, required),
					})}
				</Button>
			);
		}
		return undefined;
	};

	// ----------------------------------------
	// Render
	return (
		<Show
			when={hasChecks()}
			fallback={
				<p class="text-sm text-muted">{T()("requests.checks.document.none")}</p>
			}
		>
			<div class="grid w-full gap-3">
				<ul class="divide-y divide-border rounded-md border border-border bg-input">
					<Show when={failed()}>
						<RequestCheckRow
							tone="danger"
							title={
								props.request.failureTarget
									? T()("requests.checks.failed.target", {
											target: getTargetLabel(
												props.collection,
												props.request.failureTarget,
											),
										})
									: T()("requests.checks.failed")
							}
							description={
								<>
									{props.request.failure} {T()("requests.failed.rollback")}
								</>
							}
							action={
								<Show
									when={
										props.request.approved &&
										props.request.permissions.request &&
										props.request.blockers.length === 0
									}
								>
									<Button variant="outline" size="sm" onClick={props.onRetry}>
										{T()("requests.retry")}
									</Button>
								</Show>
							}
						/>
					</Show>
					<For each={requestBlockers()}>
						{(blocker) => (
							<RequestCheckRow
								tone="warning"
								{...getBlockerCopy(
									blocker,
									props.collection,
									props.request.type,
								)}
								action={fixFor(blocker)}
							/>
						)}
					</For>
					<For each={groups()}>
						{(group) => (
							<>
								<For each={group.blockers}>
									{(blocker) => (
										<RequestCheckRow
											tone="warning"
											{...getBlockerCopy(
												blocker,
												props.collection,
												props.request.type,
											)}
											action={fixFor(blocker)}
										/>
									)}
								</For>
								<Show when={group.workflowAllowed !== undefined}>
									<RequestCheckRow
										tone={group.workflowAllowed ? "success" : "warning"}
										{...(group.workflowAllowed
											? props.request.type === "create"
												? {
														title: T()(
															"requests.checks.workflow.create.allowed.title",
														),
														description: T()(
															"requests.checks.workflow.create.allowed",
														),
													}
												: {
														title: T()(
															"requests.checks.workflow.allowed.title",
															{
																target: group.label,
															},
														),
														description: T()(
															"requests.checks.workflow.allowed",
															{
																target: group.label,
															},
														),
													}
											: getBlockerCopy(
													{ code: "workflow", target: group.target.target },
													props.collection,
													props.request.type,
												))}
									/>
								</Show>
								<Show when={group.target.changedSinceCreation}>
									<RequestCheckRow
										tone={group.target.reviewed ? "success" : "warning"}
										title={T()("requests.checks.published", {
											target: group.label,
										})}
										description={T()("requests.checks.published.description")}
										href={compareHref(group.target.target)}
										control={
											<Checkbox
												id={`review-target-${props.document.id}-${group.target.target}`}
												value={group.target.reviewed}
												label={T()("requests.checks.published", {
													target: group.label,
												})}
												class="**:data-checkbox-label:sr-only"
												disabled={
													!props.document.permissions.edit ||
													review.action.isPending
												}
												onChange={(reviewed) =>
													review.action.mutate({
														id: props.request.id,
														requestDocumentId: props.document.id,
														body: {
															target: group.target.target,
															targetVersionId: group.target.versionId,
															revision: props.request.revision,
															reviewed,
														},
													})
												}
											/>
										}
									/>
								</Show>
							</>
						)}
					</For>
				</ul>
				<ErrorMessage theme="basic" message={review.errors()?.message} />
			</div>
		</Show>
	);
};
