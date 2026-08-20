import { A } from "@solidjs/router";
import type { Collection } from "@types";
import {
	FaSolidArrowTrendUp,
	FaSolidCalendar,
	FaSolidCircleExclamation,
	FaSolidClock,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import { type Component, createMemo, For } from "solid-js";
import { DashboardMetricTile } from "@/components/Groups/Dashboard";
import { Standard } from "@/components/Groups/Headers";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

type CollectionTargetOverview = {
	collectionKey: string;
	collectionName: string;
	collectionMode: Collection["mode"];
	environmentName: string;
	target: string;
	unreleased: number;
	outOfSync: number;
	inSync: number;
};

type TargetOverview = {
	target: string;
	name: string;
	unreleased: number;
	outOfSync: number;
	pending: number;
	scheduled: number;
	failed: number;
	collections: CollectionTargetOverview[];
};

const PublishingOverviewRoute: Component = () => {
	// ----------------------------------
	// Queries
	const collections = api.collections.useGetAll({
		queryParams: {},
	});
	const overview = api.publishing.useGetOverview({
		queryParams: {},
	});

	// ----------------------------------
	// Memos
	const readableCollections = createMemo(() =>
		(collections.data?.data ?? []).filter(
			(collection) =>
				collection.environments.length > 0 &&
				userStore.get.hasPermission([collection.permissions.read]).all,
		),
	);
	const collectionsByKey = createMemo(
		() =>
			new Map(
				readableCollections().map((collection) => [collection.key, collection]),
			),
	);
	const targets = createMemo<TargetOverview[]>(() => {
		const targetsByKey = new Map<string, TargetOverview>();

		for (const collectionOverview of overview.data?.data.collections ?? []) {
			const collection = collectionsByKey().get(
				collectionOverview.collectionKey,
			);
			if (!collection) continue;

			const collectionName =
				helpers.getLocaleValue({
					value: collection.details.name,
					fallback: collection.key,
				}) || collection.key;

			for (const environmentOverview of collectionOverview.environments) {
				const environment = collection.environments.find(
					(item) => item.key === environmentOverview.target,
				);
				const environmentName =
					helpers.getLocaleValue({
						value: environment?.name,
						fallback: environmentOverview.target,
					}) || environmentOverview.target;
				const current = targetsByKey.get(environmentOverview.target) ?? {
					target: environmentOverview.target,
					name: environmentName,
					unreleased: 0,
					outOfSync: 0,
					pending: 0,
					scheduled: 0,
					failed: 0,
					collections: [],
				};

				current.unreleased += environmentOverview.unreleased;
				current.outOfSync += environmentOverview.outOfSync;
				current.collections.push({
					collectionKey: collection.key,
					collectionName,
					collectionMode: collection.mode,
					environmentName,
					target: environmentOverview.target,
					unreleased: environmentOverview.unreleased,
					outOfSync: environmentOverview.outOfSync,
					inSync: environmentOverview.inSync,
				});
				targetsByKey.set(environmentOverview.target, current);
			}
		}

		for (const releaseOverview of overview.data?.data.releaseRequests ?? []) {
			const target = targetsByKey.get(releaseOverview.target);
			if (!target) continue;

			target.pending = releaseOverview.pending;
			target.scheduled = releaseOverview.scheduled;
			target.failed = releaseOverview.failed;
		}

		return Array.from(targetsByKey.values());
	});
	const collectionRows = createMemo(() =>
		targets().flatMap((target) => target.collections),
	);

	// ----------------------------------
	// Functions
	const statusHref = (
		row: CollectionTargetOverview,
		status: "unreleased" | "out-of-sync",
	) => {
		const collectionHref = `/lucid/collections/${row.collectionKey}`;
		if (row.collectionMode === "single") return collectionHref;

		const params = new URLSearchParams({
			[`filter[envStatus.${row.target}]`]: status,
		});
		return `${collectionHref}?${params.toString()}`;
	};

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("routes.publishing.overview.title"),
							description: T()("routes.publishing.overview.description"),
						}}
					/>
				),
			}}
		>
			<DynamicContent
				state={{
					isError: collections.isError || overview.isError,
					isSuccess: collections.isSuccess && overview.isSuccess,
					isLoading: collections.isLoading || overview.isLoading,
					isEmpty: targets().length === 0,
				}}
				options={{ padding: "24" }}
				copy={{
					noEntries: {
						title: T()("publishing.overview.empty.title"),
						description: T()("publishing.overview.empty.description"),
					},
				}}
			>
				<div class="flex min-w-0 flex-col gap-8">
					<For each={targets()}>
						{(target) => (
							<section>
								<div class="mb-3">
									<h2>{target.name}</h2>
									<p class="mt-0.5 text-sm text-body">
										{T()("publishing.overview.target.description", {
											target: target.name,
										})}
									</p>
								</div>
								<div class="overflow-hidden rounded-md border border-border bg-card-base">
									<div class="grid grid-cols-1 bg-card-base sm:grid-cols-2 xl:grid-cols-5">
										<DashboardMetricTile
											icon={<FaSolidArrowTrendUp size={14} />}
											label={T()("publishing.overview.behind")}
											value={target.outOfSync}
											descriptionLines={2}
											description={T()(
												"publishing.overview.behind.description",
											)}
											tone="yellow"
											class="border-b border-border sm:odd:border-r xl:border-b-0 xl:not-last:border-r"
										/>
										<DashboardMetricTile
											icon={<FaSolidCircleExclamation size={14} />}
											label={T()("common.status.unreleased")}
											value={target.unreleased}
											descriptionLines={2}
											description={T()(
												"publishing.overview.unreleased.description",
											)}
											tone="grey"
											class="border-b border-border xl:border-b-0 xl:not-last:border-r"
										/>
										<DashboardMetricTile
											icon={<FaSolidClock size={14} />}
											label={T()("common.pending.review")}
											value={target.pending}
											descriptionLines={2}
											description={T()(
												"dashboard.release.requests.pending.description",
											)}
											tone="yellow"
											href={`/lucid/publishing/requests?filter[target]=${encodeURIComponent(target.target)}&filter[status]=pending`}
											class="border-b border-border sm:odd:border-r xl:border-b-0 xl:not-last:border-r"
										/>
										<DashboardMetricTile
											icon={<FaSolidCalendar size={14} />}
											label={T()("common.status.scheduled")}
											value={target.scheduled}
											descriptionLines={2}
											description={T()(
												"dashboard.release.requests.scheduled.description",
											)}
											tone="purple"
											href={`/lucid/publishing/requests?filter[target]=${encodeURIComponent(target.target)}&filter[executionStatus]=scheduled`}
											class="border-b border-border xl:border-b-0 xl:not-last:border-r"
										/>
										<DashboardMetricTile
											icon={<FaSolidTriangleExclamation size={14} />}
											label={T()("common.status.failed")}
											value={target.failed}
											descriptionLines={2}
											description={T()(
												"dashboard.release.requests.failed.description",
											)}
											tone="red"
											href={`/lucid/publishing/requests?filter[target]=${encodeURIComponent(target.target)}&filter[executionStatus]=failed`}
											class="xl:not-last:border-r"
										/>
									</div>
								</div>
							</section>
						)}
					</For>

					<section>
						<div class="mb-3">
							<h2>{T()("publishing.overview.collections.title")}</h2>
							<p class="mt-0.5 text-sm text-body">
								{T()("publishing.overview.collections.description")}
							</p>
						</div>
						<div class="overflow-hidden rounded-md border border-border bg-card-base divide-y divide-border">
							<For each={collectionRows()}>
								{(row) => (
									<article class="grid gap-4 px-4 py-4 md:grid-cols-[minmax(180px,1fr)_repeat(3,minmax(100px,auto))] md:items-center">
										<div class="min-w-0">
											<h3 class="truncate text-sm font-medium text-title">
												{row.collectionName}
											</h3>
											<p class="mt-1 truncate text-xs text-body">
												{row.environmentName}
											</p>
										</div>
										<div>
											<span class="block text-xs text-body">
												{T()("common.status.in.sync")}
											</span>
											<span class="mt-1 block text-sm font-semibold text-title">
												{row.inSync}
											</span>
										</div>
										<A
											href={statusHref(row, "out-of-sync")}
											class="rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-primary-base"
										>
											<span class="block text-xs text-body">
												{T()("publishing.overview.behind")}
											</span>
											<span class="mt-1 block text-sm font-semibold text-warning-base hover:underline">
												{row.outOfSync}
											</span>
										</A>
										<A
											href={statusHref(row, "unreleased")}
											class="rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-primary-base"
										>
											<span class="block text-xs text-body">
												{T()("common.status.unreleased")}
											</span>
											<span class="mt-1 block text-sm font-semibold text-title hover:underline">
												{row.unreleased}
											</span>
										</A>
									</article>
								)}
							</For>
						</div>
					</section>
				</div>
			</DynamicContent>
		</Wrapper>
	);
};

export default PublishingOverviewRoute;
