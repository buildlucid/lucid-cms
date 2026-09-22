import { type Component, createMemo, For, Show } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import PageLayout from "@/components/PageLayout/PageLayout";
import Pill from "@/components/Pill/Pill";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import SystemSettingsHeader from "@/components/SystemSettingsHeader/SystemSettingsHeader";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

/** Past this much of the storage limit the usage bar warns. */
const STORAGE_DANGER_PERCENT = 90;

const SystemOverviewPage: Component = () => {
	// ----------------------------------
	// Queries
	const settingsData = api.settings.useGetSettings({
		queryParams: {
			include: {
				email: true,
				media: true,
				system: true,
			},
		},
	});

	// ----------------------------------------
	// Memos
	const storageInfo = createMemo(
		() => settingsData.data?.data?.media?.storage ?? null,
	);
	const isUnlimitedStorage = createMemo(
		() => storageInfo()?.total === null || storageInfo()?.remaining === null,
	);
	const clampedRemainingStorage = createMemo(() =>
		Math.max(0, storageInfo()?.remaining ?? 0),
	);
	const percentUsed = createMemo(() => {
		if (isUnlimitedStorage()) return 100;
		const total = storageInfo()?.total ?? 0;
		const used = storageInfo()?.used ?? 0;
		if (total <= 0 || used <= 0) return 0;

		const rawPercent = (used / total) * 100;
		return Math.max(0, Math.min(100, Math.floor(rawPercent)));
	});
	const storageTitle = createMemo(() => {
		if (isUnlimitedStorage()) return T()("media.storage.unlimited.title");
		return T()("media.storage.remaining.title", {
			storage: helpers.bytesToSize(clampedRemainingStorage()),
		});
	});
	const storageBarLabels = createMemo(() => {
		if (isUnlimitedStorage()) {
			return {
				start: helpers.bytesToSize(storageInfo()?.used),
				end: T()("common.unlimited"),
			};
		}
		return {
			start: helpers.bytesToSize(storageInfo()?.used),
			end: helpers.bytesToSize(storageInfo()?.total),
		};
	});
	const contentLocales = createMemo(() => contentLocaleStore.get.locales);
	const systemInfo = createMemo(() => settingsData.data?.data?.system);
	const emailInfo = createMemo(() => settingsData.data?.data?.email);
	const emailFromValue = createMemo(() => {
		const from = emailInfo()?.from;
		return from ? `${from.name} <${from.email}>` : "-";
	});
	const emailTemplates = createMemo(() => emailInfo()?.templates ?? []);

	// ----------------------------------------
	// Render

	return (
		<PageLayout.Root>
			<SystemSettingsHeader />
			<PageLayout.Body>
				<QueryBoundary
					loading={settingsData.isLoading}
					error={settingsData.isError}
					class="flex-1 h-full p-4 md:p-6"
				>
					<InfoRow.Root
						title={T()("media.info.title")}
						description={T()("media.info.description")}
					>
						<InfoRow.Content title={storageTitle()}>
							<ProgressBar
								value={percentUsed()}
								variant={
									percentUsed() > STORAGE_DANGER_PERCENT &&
									!isUnlimitedStorage()
										? "danger"
										: "primary"
								}
								labels={storageBarLabels()}
							/>
						</InfoRow.Content>
						<InfoRow.Content
							title={T()("media.processed.title")}
							description={T()("media.processed.settings.message", {
								limit:
									settingsData.data?.data?.media?.processed.imageLimit || 0,
							})}
						>
							<DetailsList
								variant="plain"
								items={[
									{
										label: T()("common.stored"),
										value: settingsData.data?.data?.media?.processed.stored
											? T()("common.yes")
											: T()("common.no"),
									},
									{
										label: T()("common.limit"),
										value:
											settingsData.data?.data?.media?.processed.imageLimit ?? 0,
									},
									{
										label: T()("common.total"),
										value: settingsData.data?.data?.media?.processed.total ?? 0,
									},
								]}
							/>
						</InfoRow.Content>
					</InfoRow.Root>

					<InfoRow.Root
						title={T()("system.email.info.title")}
						description={T()("system.email.info.description")}
					>
						<InfoRow.Content title={T()("system.email.delivery.title")}>
							<DetailsList
								variant="plain"
								items={[
									{
										label: T()("common.simulated"),
										value:
											emailInfo()?.simulated === true
												? T()("common.yes")
												: T()("common.no"),
									},
									{
										label: T()("common.from"),
										value: emailFromValue(),
									},
								]}
							/>
						</InfoRow.Content>
						<InfoRow.Content title={T()("common.available.templates")}>
							<Show
								when={emailTemplates().length > 0}
								fallback={
									<p class="text-sm text-muted">
										{T()("empty.states.templates")}
									</p>
								}
							>
								<div class="flex flex-wrap gap-2">
									<For each={emailTemplates()}>
										{(template) => <Pill variant="outline">{template}</Pill>}
									</For>
								</div>
							</Show>
						</InfoRow.Content>
					</InfoRow.Root>
					<InfoRow.Root
						title={T()("system.info.title")}
						description={T()("system.info.description")}
					>
						<InfoRow.Content
							title={T()("system.adapters.title")}
							description={T()("system.adapters.description")}
						>
							<DetailsList
								variant="plain"
								items={[
									{
										label: T()("common.runtime"),
										value: systemInfo()?.runtime ?? "-",
									},
									{
										label: T()("common.database"),
										value: systemInfo()?.database ?? "-",
									},
									{
										label: T()("common.kv"),
										value: systemInfo()?.kv ?? "-",
									},
									{
										label: T()("common.queue"),
										value: systemInfo()?.queue ?? "-",
									},
									{
										label: T()("common.media"),
										value: systemInfo()?.mediaStorage ?? "-",
									},
									{
										label: T()("common.email"),
										value: systemInfo()?.email ?? "-",
									},
									{
										label: T()("common.media.delivery"),
										value: systemInfo()?.mediaDelivery ?? "-",
									},
								]}
							/>
						</InfoRow.Content>
						<InfoRow.Content
							title={T()("settings.interface.content.locales.title")}
							description={T()(
								"settings.interface.content.locales.description",
							)}
						>
							<DetailsList
								variant="plain"
								items={
									contentLocales().map((locale) => ({
										label: locale.name || locale.code,
										value: `${locale.code} ${
											locale.isDefault ? `(${T()("common.default")})` : ""
										} `,
									})) || []
								}
							/>
						</InfoRow.Content>
					</InfoRow.Root>
				</QueryBoundary>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default SystemOverviewPage;
