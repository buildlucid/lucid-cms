import type { RequestDetail, RequestUser } from "@types";
import classNames from "classnames";
import {
	FaSolidCalendar,
	FaSolidCircleDot,
	FaSolidInfo,
	FaSolidUserCheck,
} from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import DateText from "@/components/DateText/DateText";
import DetailsList, {
	type DetailsListProps,
} from "@/components/DetailsList/DetailsList";
import DocumentSidebarSection from "@/components/DocumentSidebarSection/DocumentSidebarSection";
import SelectMultiple from "@/components/SelectMultiple/SelectMultiple";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import UserSelectOption from "@/components/UserSelectOption/UserSelectOption";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getRequestState, requestStates } from "@/utils/requests";

const userName = (user: RequestUser) =>
	helpers.formatUserName(user, "name") || user.email || T()("common.unknown");
const toOption = (user: RequestUser) => ({
	value: user.id,
	label: userName(user),
	user,
});

export const RequestSidebar: Component<{
	request: RequestDetail;
	publishing: boolean;
	onSchedule: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const eligible = api.requests.useGetReviewers({
		queryParams: { location: { id: () => props.request.id } },
		enabled: () => props.request.permissions.edit,
	});
	const update = api.requests.useUpdateSingle();

	// ----------------------------------------
	// Memos
	const state = createMemo(() => getRequestState(props.request));
	//* the approval that completed the set
	const approvedAt = createMemo(
		() => props.request.approvals.at(-1)?.approvedAt ?? null,
	);
	const reviewerOptions = createMemo(() =>
		props.request.reviewers.map(toOption),
	);
	//* someone who approved is a reviewer even if they are not on the eligible list
	const options = createMemo(() => [
		...reviewerOptions(),
		...(eligible.data?.data ?? [])
			.filter(
				(user) =>
					!props.request.reviewers.some((reviewer) => reviewer.id === user.id),
			)
			.map(toOption),
	]);
	const status = createMemo<DetailsListProps["items"]>(() => [
		{
			label: T()("common.status"),
			value: (
				<span class="flex items-center gap-2">
					<StatusIndicator
						variant={
							props.publishing
								? "blue-subtle"
								: requestStates[state()].indicator
						}
					/>
					{props.publishing
						? T()("common.publishing")
						: requestStates[state()].label()}
				</span>
			),
		},
		{
			label: T()("requests.sidebar.approvals"),
			value: T()("requests.sidebar.approvals.count", {
				count: props.request.approvals.length,
				required: props.request.requiredApprovals,
			}),
			//* only while waiting, as a request keeps its approval if collections later need more
			show:
				props.request.status === "open" &&
				!props.request.approved &&
				props.request.requiredApprovals > 1,
		},
		{
			label: T()("requests.sidebar.approved.by"),
			value: (
				<ul
					class={classNames("grid gap-2", {
						"pt-1.5": props.request.approvals.length > 1,
					})}
				>
					<For each={props.request.approvals}>
						{(approval) => (
							<li>
								<Show when={approval.user} fallback={T()("common.unknown")}>
									{(user) => (
										<UserDisplay
											user={user()}
											variant="horizontal"
											size="xs"
											nameFormat="name"
										/>
									)}
								</Show>
							</li>
						)}
					</For>
				</ul>
			),
			show: props.request.approvals.length > 0,
			stacked: props.request.approvals.length > 1,
		},
		{
			label: T()("requests.sidebar.approved.at"),
			value: <DateText date={approvedAt()} class="text-sm" />,
			show: props.request.approved && approvedAt() !== null,
		},
		{
			label: T()("requests.meta.completed"),
			value: (
				<DateText
					date={props.request.completedAt}
					includeTime={true}
					class="text-sm"
				/>
			),
			show: props.request.completedAt !== null,
		},
		{
			label: T()("requests.sidebar.failure"),
			value: <span class="text-danger">{props.request.failure}</span>,
			show: state() === "failed",
			stacked: true,
			wrap: true,
		},
	]);
	const schedule = createMemo<DetailsListProps["items"]>(() => [
		{
			label: T()("requests.sidebar.scheduled.for"),
			value: props.request.scheduledAt ? (
				<DateText
					date={props.request.scheduledAt}
					includeTime={true}
					class="text-sm"
				/>
			) : (
				T()("requests.schedule.none")
			),
		},
	]);
	const details = createMemo<DetailsListProps["items"]>(() => [
		{
			label: T()("common.created.by"),
			value: props.request.createdBy ? (
				<UserDisplay
					user={props.request.createdBy}
					variant="horizontal"
					size="xs"
					nameFormat="name"
				/>
			) : (
				T()("common.unknown")
			),
		},
		{
			label: T()("common.created.at"),
			value: <DateText date={props.request.createdAt} class="text-sm" />,
		},
		{
			label: T()("common.updated.at"),
			value: <DateText date={props.request.updatedAt} class="text-sm" />,
			show: props.request.updatedAt !== null,
		},
		{
			label: T()("requests.documents"),
			value: props.request.documents.length,
		},
	]);

	// ----------------------------------------
	// Render
	return (
		<aside class="w-full shrink-0 rounded-t-xl border-t border-border bg-card lg:w-82.5 lg:self-stretch lg:rounded-none lg:border-t-0 lg:border-s">
			<div class="flex flex-col gap-5 p-4 md:p-5 lg:sticky lg:top-(--page-layout-sticky-top)">
				<DocumentSidebarSection
					title={T()("requests.sidebar.status")}
					icon={<FaSolidCircleDot size={12} />}
					preferenceKey="request.sidebar.status"
				>
					<DetailsList variant="plain" items={status()} />
				</DocumentSidebarSection>
				<div class="border-t border-border" aria-hidden="true" />
				<DocumentSidebarSection
					title={T()("requests.reviewers")}
					icon={<FaSolidUserCheck size={12} />}
					preferenceKey="request.sidebar.reviewers"
					meta={props.request.reviewers.length || undefined}
				>
					<Show
						when={props.request.permissions.edit}
						fallback={
							<Show
								when={props.request.reviewers.length > 0}
								fallback={
									<p class="text-sm text-muted">
										{T()("requests.reviewers.empty")}
									</p>
								}
							>
								<ul class="grid gap-2">
									<For each={props.request.reviewers}>
										{(reviewer) => (
											<li>
												<UserDisplay
													user={reviewer}
													size="xs"
													nameFormat="name"
												/>
											</li>
										)}
									</For>
								</ul>
							</Show>
						}
					>
						<SelectMultiple
							id="request-reviewers"
							name="request-reviewers"
							values={reviewerOptions()}
							onChange={(values) =>
								update.action.mutate({
									id: props.request.id,
									body: { reviewerIds: values.map((value) => value.value) },
								})
							}
							options={options()}
							placeholder={T()("requests.reviewers.add")}
							disabled={update.action.isPending}
							variant="list"
							renderValue={(value) => (
								<UserSelectOption
									user={value.value.user}
									label={value.value.label}
									removeValue={value.removeValue}
								/>
							)}
							renderOption={(option) => (
								<UserSelectOption
									user={option.option.user}
									label={option.option.label}
								/>
							)}
						/>
					</Show>
				</DocumentSidebarSection>
				<Show when={props.request.status === "open"}>
					<div class="border-t border-border" aria-hidden="true" />
					<DocumentSidebarSection
						title={T()("requests.sidebar.schedule")}
						icon={<FaSolidCalendar size={12} />}
						preferenceKey="request.sidebar.schedule"
					>
						<DetailsList variant="plain" items={schedule()} />
						<Show when={props.request.scheduledAt}>
							<p class="mt-2 text-xs text-body">
								{props.request.approved
									? T()("requests.schedule.ready")
									: T()("requests.schedule.waiting")}
							</p>
						</Show>
						<Show when={props.request.permissions.request}>
							<Button
								variant="outline"
								size="sm"
								class="mt-4 w-full"
								onClick={() => props.onSchedule()}
							>
								{props.request.scheduledAt
									? T()("requests.schedule.change")
									: T()("requests.schedule.add")}
							</Button>
						</Show>
					</DocumentSidebarSection>
				</Show>
				<div class="border-t border-border" aria-hidden="true" />
				<DocumentSidebarSection
					title={T()("requests.sidebar.details")}
					icon={<FaSolidInfo size={12} />}
					preferenceKey="request.sidebar.details"
				>
					<DetailsList variant="plain" items={details()} />
				</DocumentSidebarSection>
			</div>
		</aside>
	);
};
