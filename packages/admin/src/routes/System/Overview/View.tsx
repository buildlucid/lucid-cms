import { type Component, createMemo, For, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import DetailsList from "@/components/Partials/DetailsList";
import Pill from "@/components/Partials/Pill";
import ProgressBar from "@/components/Partials/ProgressBar";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

const SystemOverviewRoute: Component = () => {
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
		<Wrapper
			slots={{
				header: <SystemSettingsHeader />,
			}}
		>
			<DynamicContent
				state={{
					isError: settingsData.isError,
					isSuccess: settingsData.isSuccess,
					isLoading: settingsData.isLoading,
				}}
				options={{
					padding: "24",
				}}
			>
				<InfoRow.Root
					title={T()("media.info.title")}
					description={T()("media.info.description")}
				>
					<InfoRow.Content title={storageTitle()} reducedMargin={true}>
						<ProgressBar
							progress={percentUsed()}
							type={isUnlimitedStorage() ? "target" : "usage"}
							labels={storageBarLabels()}
						/>
					</InfoRow.Content>
					<InfoRow.Content
						title={T()("media.processed.title")}
						description={T()("media.processed.settings.message", {
							limit: settingsData.data?.data?.media?.processed.imageLimit || 0,
						})}
						reducedMargin={true}
					>
						<DetailsList
							type="text"
							theme="contained"
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
					<InfoRow.Content
						title={T()("system.email.delivery.title")}
						reducedMargin={true}
					>
						<DetailsList
							type="text"
							theme="contained"
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
					<InfoRow.Content
						title={T()("common.available.templates")}
						reducedMargin={true}
					>
						<Show
							when={emailTemplates().length > 0}
							fallback={
								<p class="text-sm text-unfocused">
									{T()("empty.states.templates")}
								</p>
							}
						>
							<div class="flex flex-wrap gap-2">
								<For each={emailTemplates()}>
									{(template) => <Pill theme="outline">{template}</Pill>}
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
						reducedMargin={true}
					>
						<DetailsList
							type="text"
							theme="contained"
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
									value: systemInfo()?.media ?? "-",
								},
								{
									label: T()("common.email"),
									value: systemInfo()?.email ?? "-",
								},
								{
									label: T()("common.image.processor"),
									value: systemInfo()?.imageProcessor ?? "-",
								},
							]}
						/>
					</InfoRow.Content>
					<InfoRow.Content
						title={T()("settings.interface.content.locales.title")}
						description={T()("settings.interface.content.locales.description")}
						reducedMargin={true}
					>
						<DetailsList
							type="text"
							theme="contained"
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
			</DynamicContent>
		</Wrapper>
	);
};

export default SystemOverviewRoute;
