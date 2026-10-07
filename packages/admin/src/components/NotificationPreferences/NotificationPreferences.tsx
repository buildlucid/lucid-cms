import type { NotificationPreference } from "@types";
import { type Component, createMemo, Index } from "solid-js";
import CheckboxGroupRow from "@/components/CheckboxGroupRow/CheckboxGroupRow";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import api from "@/services/api";
import T from "@/translations";
import { groupByCategory } from "@/utils/notifications";

const NotificationPreferences: Component = () => {
	// ----------------------------------------
	// Queries & Mutations
	const preferences = api.notifications.useGetPreferences();
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
			loading={preferences.isLoading}
			error={preferences.isError}
			empty={groups().length === 0}
			emptyFallback={
				<p class="text-sm text-muted">
					{T()("notifications.preferences.empty")}
				</p>
			}
		>
			<ul class="divide-y divide-border">
				{/* by position, so each row stays open across the refetch after a save */}
				<Index each={groups()}>
					{(group) => (
						<CheckboxGroupRow
							id={`preferences-${group().key}`}
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
