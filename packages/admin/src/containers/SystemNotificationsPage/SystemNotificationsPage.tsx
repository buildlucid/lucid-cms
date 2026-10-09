import { type Component, createMemo, Index } from "solid-js";
import InfoRow from "@/components/InfoRow/InfoRow";
import NotificationTypeSettings from "@/components/NotificationTypeSettings/NotificationTypeSettings";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";
import { groupByCategory } from "@/utils/notifications";

const SystemNotificationsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.system.notifications.title"));

	// ----------------------------------------
	// Queries
	const types = api.notifications.useGetTypes();
	const roles = api.roles.useGetMultiple({
		queryParams: {
			include: { permissions: false },
			perPage: -1,
		},
	});

	// ----------------------------------------
	// Memos
	const groups = createMemo(() => groupByCategory(types.data?.data ?? []));

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.system.notifications.title")}
				description={T()("routes.system.notifications.description")}
			/>
			<PageLayout.Body>
				<QueryBoundary
					loading={types.isLoading || roles.isLoading}
					error={types.isError || roles.isError}
					class="flex-1 h-full p-4 md:p-6"
				>
					{/* by position, so rows keep their open role pickers across refetches */}
					<Index each={groups()}>
						{(group) => (
							<InfoRow.Root
								title={group().label}
								description={T()(
									"notifications.settings.category.description",
									{ category: group().label },
								)}
							>
								<InfoRow.Content class="overflow-hidden p-0">
									<ul class="divide-y divide-border">
										<Index each={group().items}>
											{(type) => (
												<NotificationTypeSettings
													type={type()}
													roles={roles.data?.data ?? []}
												/>
											)}
										</Index>
									</ul>
								</InfoRow.Content>
							</InfoRow.Root>
						)}
					</Index>
				</QueryBoundary>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default SystemNotificationsPage;
