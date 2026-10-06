import { A } from "@solidjs/router";
import type { Collection, RequestEvent, RequestUser } from "@types";
import classNames from "classnames";
import {
	FaSolidBan,
	FaSolidCalendar,
	FaSolidCheck,
	FaSolidCircleExclamation,
	FaSolidCloudArrowUp,
	FaSolidListCheck,
	FaSolidMinus,
	FaSolidPen,
	FaSolidPlus,
	FaSolidRocket,
	FaSolidRotate,
	FaSolidUserMinus,
	FaSolidUserPlus,
} from "solid-icons/fa";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import DateText from "@/components/DateText/DateText";
import RichTextContent from "@/components/RichTextContent/RichTextContent";
import T from "@/translations";
import { formatStageName } from "@/utils/document-sidebar";
import helpers from "@/utils/helpers";
import { getTargetLabel } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";

type SystemEvent = Exclude<RequestEvent, { type: "comment" }>;

export const RequestEventEntry: Component<{
	event: SystemEvent;
	collection: Collection | undefined;
	documentId?: number;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const userName = (user: RequestUser | null) =>
		user
			? helpers.formatUserName(user, "name") ||
				user.email ||
				T()("common.unknown")
			: T()("common.unknown");
	const name = createMemo(() =>
		props.event.user
			? userName(props.event.user)
			: T()("requests.activity.system"),
	);
	//* grouped requests say which document an event is about
	const withDocument = (label: string) => {
		if (props.documentId === undefined) return label;
		const collection = helpers.getLocaleValue({
			value: props.collection?.details.labels.singular,
			fallback: props.collection?.key,
		});
		return `${label} (${collection} #${props.documentId})`;
	};
	const targetLabel = (target: string) =>
		withDocument(getTargetLabel(props.collection, target));
	const details = createMemo(
		(): {
			icon: Component<{ size?: number }>;
			tone: "default" | "success" | "danger" | "request";
			text: JSXElement;
		} => {
			const event = props.event;
			switch (event.type) {
				case "approved":
					return {
						icon: FaSolidCheck,
						tone: "success",
						text: T()("requests.activity.approved", { name: name() }),
					};
				case "approval_dismissed":
					return {
						icon: FaSolidRotate,
						tone: "default",
						text: event.user
							? T()("requests.activity.withdrawn", { name: name() })
							: T()("requests.activity.dismissed"),
					};
				case "schedule_updated":
					return {
						icon: FaSolidCalendar,
						tone: "default",
						text: event.scheduledAt ? (
							<>
								{T()("requests.activity.scheduled", { name: name() })}{" "}
								<DateText date={event.scheduledAt} includeTime={true} />
							</>
						) : (
							T()("requests.activity.unscheduled", { name: name() })
						),
					};
				case "completed":
					return {
						icon: FaSolidRocket,
						tone: "request",
						text: T()("requests.activity.completed", { name: name() }),
					};
				case "failed":
					return {
						icon: FaSolidCircleExclamation,
						tone: "danger",
						text: T()("requests.activity.failed", { message: event.message }),
					};
				case "target_published":
					return {
						icon: FaSolidCloudArrowUp,
						tone: "default",
						text:
							event.sourceRequestId === null ? (
								T()("requests.activity.target.published.direct", {
									name: name(),
									target: targetLabel(event.target),
								})
							) : (
								<>
									{T()("requests.activity.target.published.request", {
										name: name(),
										target: targetLabel(event.target),
									})}{" "}
									<A
										href={getRequestRoute({ requestId: event.sourceRequestId })}
										class="text-sm text-title underline-offset-2 hover:underline"
									>
										{T()("requests.view")}
									</A>
								</>
							),
					};
				case "target_added":
				case "target_removed":
					return {
						icon: event.type === "target_added" ? FaSolidPlus : FaSolidMinus,
						tone: "default",
						text: T()(
							event.type === "target_added"
								? "requests.activity.target.added"
								: "requests.activity.target.removed",
							{ name: name(), target: targetLabel(event.target) },
						),
					};
				case "workflow_updated":
					return {
						icon: FaSolidListCheck,
						tone: "default",
						text: T()("requests.activity.workflow.updated", {
							name: name(),
							stage: withDocument(
								formatStageName({
									collection: props.collection,
									stageKey: event.stage,
								}),
							),
						}),
					};
				case "proposal_edited":
					return {
						icon: FaSolidPen,
						tone: "default",
						text: T()("requests.activity.proposal.edited", {
							name: name(),
							document: withDocument(T()("requests.activity.proposal")),
						}),
					};
				case "target_reviewed":
					return {
						icon: FaSolidCheck,
						tone: "default",
						text: T()("requests.activity.target.reviewed", {
							name: name(),
							target: targetLabel(event.target),
						}),
					};
				case "target_unreviewed":
					return {
						icon: FaSolidRotate,
						tone: "default",
						text: T()("requests.activity.target.unreviewed", {
							name: name(),
							target: targetLabel(event.target),
						}),
					};
				case "document_added":
				case "document_removed":
					return {
						icon: FaSolidRotate,
						tone: "default",
						text: T()(
							event.type === "document_added"
								? "requests.activity.document.added"
								: "requests.activity.document.removed",
							{
								name: name(),
								document: `${helpers.getLocaleValue({ value: props.collection?.details.labels.singular, fallback: event.collectionKey })} #${event.documentId}`,
							},
						),
					};
				case "reviewer_added":
				case "reviewer_removed":
					return {
						icon:
							event.type === "reviewer_added"
								? FaSolidUserPlus
								: FaSolidUserMinus,
						tone: "default",
						text: T()(
							event.type === "reviewer_added"
								? "requests.activity.reviewer.added"
								: "requests.activity.reviewer.removed",
							{ name: name(), reviewer: userName(event.reviewer) },
						),
					};
				case "closed":
					return {
						icon: FaSolidBan,
						tone: "default",
						text: T()("requests.activity.closed", { name: name() }),
					};
				case "reopened":
					return {
						icon: FaSolidRotate,
						tone: "default",
						text: T()("requests.activity.reopened", { name: name() }),
					};
			}
		},
	);

	// ----------------------------------------
	// Render
	return (
		<li class="relative flex gap-3 py-2.5">
			<span
				class={classNames(
					"relative z-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
					{
						"border-border bg-background text-icon":
							details().tone === "default",
						"border-success-low-border bg-success-low text-success-low-foreground":
							details().tone === "success",
						"border-danger-low-border bg-danger-low text-danger-low-foreground":
							details().tone === "danger",
						"border-purple-low-border bg-purple-low text-purple-low-foreground":
							details().tone === "request",
					},
				)}
			>
				<Dynamic component={details().icon} size={11} />
			</span>
			<div class="min-w-0 grow pt-1">
				<p class="text-sm text-body">
					{details().text}
					<span class="text-border"> · </span>
					<DateText
						date={props.event.createdAt}
						includeTime={true}
						class="text-xs"
					/>
				</p>
				<Show
					when={
						props.event.type === "approved" && props.event.body
							? props.event.body
							: undefined
					}
				>
					{(body) => (
						<div class="mt-2 text-sm text-subtitle">
							<RichTextContent value={body()} />
						</div>
					)}
				</Show>
			</div>
		</li>
	);
};
