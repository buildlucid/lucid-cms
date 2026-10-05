import type {
	Collection,
	Release,
	ReleaseBlocker,
	ReleaseDocument,
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
} from "@/utils/releases";
import { getReleaseRoute } from "@/utils/route-helpers";
import { ReleaseCheckRow } from "./ReleaseCheckRow";

/**
 * One document's checks, grouped by environment: anything blocking it, its
 * workflow stage, and publishes by someone else to acknowledge after
 * comparing. A failed release attempt for the document comes first, with a
 * retry. Only shown while the release is open.
 */
export const ReleaseChecks: Component<{
	release: Release;
	document: ReleaseDocument;
	collection: Collection | undefined;
	onRetry: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const update = api.releases.useUpdateTargets();
	const review = api.releases.useReviewTarget();

	// ----------------------------------------
	// Memos
	const failed = createMemo(
		() =>
			props.release.failure !== null &&
			props.release.failureReleaseDocumentId === props.document.id,
	);
	//* blockers about the whole release, shown before the per-environment groups
	const releaseBlockers = createMemo(() =>
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
			releaseBlockers().length > 0 ||
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
			id: props.release.id,
			releaseDocumentId: props.document.id,
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
			? `${getReleaseRoute({ releaseId: props.release.id, content: props.document })}?compare=${encodeURIComponent(target)}`
			: undefined;
	const fixFor = (blocker: ReleaseBlocker): JSXElement => {
		const required = blocker.required;
		if (
			blocker.code === "prerequisite" &&
			required &&
			props.release.permissions.edit &&
			getAllowedTargets(props.collection, props.document.source).includes(
				required,
			)
		) {
			return (
				<Button
					variant="outline"
					size="xs"
					loading={update.action.isPending}
					onClick={() => addTarget(required)}
				>
					{T()("releases.checks.add.target", {
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
				<p class="text-sm text-muted">{T()("releases.checks.document.none")}</p>
			}
		>
			<div class="grid w-full gap-3">
				<ul class="divide-y divide-border rounded-md border border-border bg-input">
					<Show when={failed()}>
						<ReleaseCheckRow
							tone="danger"
							title={
								props.release.failureTarget
									? T()("releases.checks.failed.target", {
											target: getTargetLabel(
												props.collection,
												props.release.failureTarget,
											),
										})
									: T()("releases.checks.failed")
							}
							description={
								<>
									{props.release.failure} {T()("releases.failed.rollback")}
								</>
							}
							action={
								<Show
									when={
										props.release.approved &&
										props.release.permissions.release &&
										props.release.blockers.length === 0
									}
								>
									<Button variant="outline" size="xs" onClick={props.onRetry}>
										{T()("releases.retry")}
									</Button>
								</Show>
							}
						/>
					</Show>
					<For each={releaseBlockers()}>
						{(blocker) => (
							<ReleaseCheckRow
								tone="warning"
								{...getBlockerCopy(blocker, props.collection)}
								action={fixFor(blocker)}
							/>
						)}
					</For>
					<For each={groups()}>
						{(group) => (
							<>
								<For each={group.blockers}>
									{(blocker) => (
										<ReleaseCheckRow
											tone="warning"
											{...getBlockerCopy(blocker, props.collection)}
											action={fixFor(blocker)}
										/>
									)}
								</For>
								<Show when={group.workflowAllowed !== undefined}>
									<ReleaseCheckRow
										tone={group.workflowAllowed ? "success" : "warning"}
										{...(group.workflowAllowed
											? {
													title: T()("releases.checks.workflow.allowed.title", {
														target: group.label,
													}),
													description: T()("releases.checks.workflow.allowed", {
														target: group.label,
													}),
												}
											: getBlockerCopy(
													{ code: "workflow", target: group.target.target },
													props.collection,
												))}
									/>
								</Show>
								<Show when={group.target.changedSinceCreation}>
									<ReleaseCheckRow
										tone={group.target.reviewed ? "success" : "warning"}
										title={T()("releases.checks.published", {
											target: group.label,
										})}
										description={T()("releases.checks.published.description")}
										href={compareHref(group.target.target)}
										action={
											<Checkbox
												id={`review-target-${props.document.id}-${group.target.target}`}
												value={group.target.reviewed}
												label={T()("releases.checks.published", {
													target: group.label,
												})}
												class="**:data-checkbox-label:sr-only"
												disabled={
													!props.document.permissions.edit ||
													review.action.isPending
												}
												onChange={(reviewed) =>
													review.action.mutate({
														id: props.release.id,
														releaseDocumentId: props.document.id,
														body: {
															target: group.target.target,
															targetVersionId: group.target.versionId,
															revision: props.release.revision,
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
