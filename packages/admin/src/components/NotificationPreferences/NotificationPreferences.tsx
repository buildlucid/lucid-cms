import type { NotificationPreference } from "@types";
import { TbOutlineBell } from "solid-icons/tb";
import { type Component, createMemo, Index } from "solid-js";
import CardState from "@/components/CardState/CardState";
import CheckboxGroupRow from "@/components/CheckboxGroupRow/CheckboxGroupRow";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import api from "@/services/api";
import T from "@/translations";
import { groupByCategory } from "@/utils/notifications";

/** Email preferences by notification category, as rows that fill an `InfoRow.Content` with `padding="none"`. */
const NotificationPreferences: Component = () => {
	// ----------------------------------------
	// Queries
	const preferences = api.notifications.useGetPreferences();

	// ----------------------------------------
	// Mutations
	const update = api.notifications.useUpdatePreferences();

	// ----------------------------------------
	// Memos
	const groups = createMemo(() =>
		groupByCategory(preferences.data?.data ?? []),
	);

	// ----------------------------------------
	// Functions
	const saveGroup = (group: NotificationPreference[], emailed: string[]) => {
		const changes = group
			.filter(
				(preference) =>
					preference.emailAvailable &&
					preference.email !== emailed.includes(preference.type),
			)
			.map((preference) => ({
				type: preference.type,
				email: emailed.includes(preference.type),
			}));
		if (changes.length > 0) update.action.mutate({ preferences: changes });
	};

	// ----------------------------------------
	// Render
	return (
		<QueryBoundary
			appearance="contained"
			loading={preferences.isLoading}
			error={preferences.isLoadingError}
			onRetry={() => preferences.refetch()}
			loadingFallback={
				<ul class="divide-y divide-border">
					<Index each={Array.from({ length: 3 })}>
						{() => (
							<li class="flex items-center gap-3 px-5 py-4">
								<span class="skeleton block size-5 shrink-0" />
								<div class="grow text-sm">
									<span class="skeleton block w-40 max-w-full">&nbsp;</span>
								</div>
								<div class="text-xs">
									<span class="skeleton block w-12">&nbsp;</span>
								</div>
							</li>
						)}
					</Index>
				</ul>
			}
			empty={groups().length === 0}
			emptyFallback={
				<CardState
					icon={<TbOutlineBell />}
					title={T()("notifications.preferences.empty.title")}
					description={T()("notifications.preferences.empty")}
				/>
			}
		>
			<ul class="divide-y divide-border">
				{/* by position, so each row stays open across the refetch after a save */}
				<Index each={groups()}>
					{(group) => (
						<CheckboxGroupRow
							id={`preferences-${group().key}`}
							padding="md"
							name={group().label}
							items={group().items.map((preference) => ({
								key: preference.type,
								label: preference.name,
								disabled: !preference.emailAvailable,
								tooltip: preference.emailAvailable
									? (preference.description ?? undefined)
									: T()("notifications.preferences.unavailable"),
							}))}
							value={group()
								.items.filter(
									(preference) => preference.email && preference.emailAvailable,
								)
								.map((preference) => preference.type)}
							onChange={(emailed) => saveGroup(group().items, emailed)}
						/>
					)}
				</Index>
			</ul>
		</QueryBoundary>
	);
};

export default NotificationPreferences;
