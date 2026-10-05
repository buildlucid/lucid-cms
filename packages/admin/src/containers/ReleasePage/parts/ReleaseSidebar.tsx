import type { Release, ReleaseUser } from "@types";
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
import { getReleaseState, releaseStates } from "@/utils/releases";

const userName = (user: ReleaseUser) =>
	helpers.formatUserName(user, "name") || user.email || T()("common.unknown");
const toOption = (user: ReleaseUser) => ({
	value: user.id,
	label: userName(user),
	user,
});

export const ReleaseSidebar: Component<{
	release: Release;
	publishing: boolean;
	onSchedule: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const eligible = api.releases.useGetReviewers({
		queryParams: { location: { id: () => props.release.id } },
		enabled: () => props.release.permissions.edit,
	});
	const update = api.releases.useUpdateSingle();

	// ----------------------------------------
	// Memos
	const state = createMemo(() => getReleaseState(props.release));
	const reviewerOptions = createMemo(() =>
		props.release.reviewers.map(toOption),
	);
	//* someone who approved is a reviewer even if they are not on the eligible list
	const options = createMemo(() => [
		...reviewerOptions(),
		...(eligible.data?.data ?? [])
			.filter(
				(user) =>
					!props.release.reviewers.some((reviewer) => reviewer.id === user.id),
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
								: releaseStates[state()].indicator
						}
					/>
					{props.publishing
						? T()("common.publishing")
						: releaseStates[state()].label()}
				</span>
			),
		},
		{
			label: T()("releases.sidebar.approved.by"),
			value: props.release.approvedBy ? (
				<UserDisplay
					user={props.release.approvedBy}
					variant="horizontal"
					size="xs"
					nameFormat="name"
				/>
			) : null,
			show: props.release.approved,
		},
		{
			label: T()("releases.sidebar.approved.at"),
			value: <DateText date={props.release.approvedAt} class="text-sm" />,
			show: props.release.approved && props.release.approvedAt !== null,
		},
		{
			label: T()("releases.meta.released"),
			value: (
				<DateText
					date={props.release.releasedAt}
					includeTime={true}
					class="text-sm"
				/>
			),
			show: props.release.releasedAt !== null,
		},
		{
			label: T()("releases.sidebar.failure"),
			value: <span class="text-danger">{props.release.failure}</span>,
			show: state() === "failed",
			stacked: true,
			wrap: true,
		},
	]);
	const schedule = createMemo<DetailsListProps["items"]>(() => [
		{
			label: T()("releases.sidebar.scheduled.for"),
			value: props.release.scheduledAt ? (
				<DateText
					date={props.release.scheduledAt}
					includeTime={true}
					class="text-sm"
				/>
			) : (
				T()("releases.schedule.none")
			),
		},
	]);
	const details = createMemo<DetailsListProps["items"]>(() => [
		{
			label: T()("common.created.by"),
			value: props.release.createdBy ? (
				<UserDisplay
					user={props.release.createdBy}
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
			value: <DateText date={props.release.createdAt} class="text-sm" />,
		},
		{
			label: T()("common.updated.at"),
			value: <DateText date={props.release.updatedAt} class="text-sm" />,
			show: props.release.updatedAt !== null,
		},
		{
			label: T()("releases.documents"),
			value: props.release.documents.length,
		},
	]);

	// ----------------------------------------
	// Render
	return (
		<aside class="w-full shrink-0 rounded-t-xl border-t border-border bg-card lg:w-82.5 lg:self-stretch lg:rounded-none lg:border-t-0 lg:border-s">
			<div class="flex flex-col gap-5 p-4 md:p-5 lg:sticky lg:top-0">
				<DocumentSidebarSection
					title={T()("releases.sidebar.status")}
					icon={<FaSolidCircleDot size={12} />}
					preferenceKey="release.sidebar.status"
				>
					<DetailsList variant="plain" items={status()} />
				</DocumentSidebarSection>
				<div class="border-t border-border" aria-hidden="true" />
				<DocumentSidebarSection
					title={T()("releases.reviewers")}
					icon={<FaSolidUserCheck size={12} />}
					preferenceKey="release.sidebar.reviewers"
					meta={props.release.reviewers.length || undefined}
				>
					<Show
						when={props.release.permissions.edit}
						fallback={
							<Show
								when={props.release.reviewers.length > 0}
								fallback={
									<p class="text-sm text-muted">
										{T()("releases.reviewers.empty")}
									</p>
								}
							>
								<ul class="grid gap-2">
									<For each={props.release.reviewers}>
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
							id="release-reviewers"
							name="release-reviewers"
							values={reviewerOptions()}
							onChange={(values) =>
								update.action.mutate({
									id: props.release.id,
									body: { reviewerIds: values.map((value) => value.value) },
								})
							}
							options={options()}
							placeholder={T()("releases.reviewers.add")}
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
				<Show when={props.release.status === "open"}>
					<div class="border-t border-border" aria-hidden="true" />
					<DocumentSidebarSection
						title={T()("releases.sidebar.schedule")}
						icon={<FaSolidCalendar size={12} />}
						preferenceKey="release.sidebar.schedule"
					>
						<DetailsList variant="plain" items={schedule()} />
						<Show when={props.release.scheduledAt}>
							<p class="mt-2 text-xs text-body">
								{props.release.approved
									? T()("releases.schedule.ready")
									: T()("releases.schedule.waiting")}
							</p>
						</Show>
						<Show when={props.release.permissions.release}>
							<Button
								variant="outline"
								size="sm"
								class="mt-4 w-full"
								onClick={() => props.onSchedule()}
							>
								{props.release.scheduledAt
									? T()("releases.schedule.change")
									: T()("releases.schedule.add")}
							</Button>
						</Show>
					</DocumentSidebarSection>
				</Show>
				<div class="border-t border-border" aria-hidden="true" />
				<DocumentSidebarSection
					title={T()("releases.sidebar.details")}
					icon={<FaSolidInfo size={12} />}
					preferenceKey="release.sidebar.details"
				>
					<DetailsList variant="plain" items={details()} />
				</DocumentSidebarSection>
			</div>
		</aside>
	);
};
