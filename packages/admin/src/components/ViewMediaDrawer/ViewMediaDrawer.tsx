import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import Drawer from "@/components/Drawer/Drawer";
import Input from "@/components/Input/Input";
import ReadonlyMediaPreview from "@/components/ReadonlyMediaPreview/ReadonlyMediaPreview";
import Select from "@/components/Select/Select";
import Switch from "@/components/Switch/Switch";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import helpers from "@/utils/helpers";

interface ViewMediaPanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		parentFolderId: Accessor<number | string | undefined>;
	};
}

const ViewMediaDrawer: Component<ViewMediaPanelProps> = (props) => {
	// ------------------------------
	// State
	const [activeTab, setActiveTab] = createSignal<"details" | "meta">("details");

	// ---------------------------------
	// Queries
	const media = api.media.useGetSingle({
		queryParams: {
			location: {
				id: props.id as Accessor<number | undefined>,
			},
		},
		enabled: () => props.state.open,
	});
	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
	});

	// ---------------------------------
	// Memos
	const locales = createMemo(() => contentLocaleStore.get.locales);
	const editableLocales = createMemo(() =>
		locales().length
			? locales().map((locale) => ({ code: locale.code }))
			: [{ code: null }],
	);
	const showAltInput = createMemo(() => {
		return media.data?.data.type === "image";
	});
	const imageMeta = createMemo(() => {
		const item = media.data?.data;
		return item?.type === "image" ? item.meta : null;
	});
	const dimensions = createMemo(() => {
		const item = media.data?.data;
		if (item?.type !== "image" && item?.type !== "video") return null;
		if (item.meta.width === null || item.meta.height === null) return null;

		return `${item.meta.width} × ${item.meta.height}`;
	});
	const duration = createMemo(() => {
		const item = media.data?.data;
		if (item?.type !== "video" && item?.type !== "audio") return null;
		if (item.meta.duration === null) return null;

		return helpers.formatMediaDuration(item.meta.duration);
	});
	const focalPoint = createMemo(() => {
		const point = imageMeta()?.focalPoint;
		if (!point) return null;

		return `${Math.round(point.x * 100)}%, ${Math.round(point.y * 100)}%`;
	});
	const folderOptions = createMemo(() => {
		const folders = foldersHierarchy.data?.data || [];
		const sorted = folders
			.slice()
			.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
			.map((f) => {
				let label = f.meta?.label ?? f.title;
				if (f.meta?.level && f.meta?.level > 0) label = `| ${label}`;
				return { value: f.id, label: label };
			});

		return [{ value: undefined, label: T()("media.folders.none") }, ...sorted];
	});
	const hasTranslationErrors = createMemo(() => false);
	const panelContent = createMemo(() => {
		return {
			title: T()("panels.media.view.title"),
		};
	});
	const panelFetchState = createMemo(() => {
		return {
			isLoading: media.isLoading || foldersHierarchy.isLoading,
			isError: media.isError || foldersHierarchy.isError,
		};
	});
	const visibleTabs = createMemo<Array<"details" | "meta">>(() => {
		const tabs: Array<"details" | "meta"> = ["details"];
		if (props.id !== undefined) tabs.push("meta");
		return tabs;
	});

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (!visibleTabs().includes(activeTab())) {
			setActiveTab("details");
		}
	});

	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={panelFetchState().isLoading}
			error={
				panelFetchState().isError ? T()("errors.generic.message") : undefined
			}
			useDefaultLocale={false}
			onReset={() => {}}
		>
			{(contentLocale) => (
				<>
					<Drawer.Header>
						<Drawer.Title>{panelContent().title}</Drawer.Title>
						<Drawer.LocaleSelect hasError={hasTranslationErrors()} />
					</Drawer.Header>
					<Drawer.Body class="flex flex-col gap-3">
						{/* Preview */}
						<Show when={media.data?.data} keyed>
							{(item) => (
								<ReadonlyMediaPreview
									media={{
										status: item.status,
										type: item.type,
										url: item.url,
									}}
									alt={
										(item.type === "image"
											? helpers.getTranslation(item.alt, contentLocale())
											: null) ||
										helpers.getTranslation(item.title, contentLocale()) ||
										""
									}
								/>
							)}
						</Show>
						<Drawer.Tabs
							items={visibleTabs().map((tab) => ({
								value: tab,
								label:
									tab === "details"
										? T()("common.details")
										: T()("common.meta"),
							}))}
							active={activeTab()}
							onChange={setActiveTab}
						/>
						<Show when={activeTab() === "details"}>
							<For each={editableLocales()}>
								{(locale) => (
									<Show when={locale.code === (contentLocale() ?? null)}>
										<Input
											id={`name-${locale.code}`}
											value={
												helpers.getTranslation(
													media.data?.data.title,
													locale.code,
												) || ""
											}
											onChange={() => {}}
											name={`name-${locale.code}`}
											type="text"
											label={T()("common.name")}
											errors={undefined}
											autocomplete="off"
											disabled={true}
										/>
										<Show when={showAltInput()}>
											<Input
												id={`alt-${locale.code}`}
												value={
													helpers.getTranslation(
														media.data?.data.type === "image"
															? media.data.data.alt
															: undefined,
														locale.code,
													) || ""
												}
												onChange={() => {}}
												name={`alt-${locale.code}`}
												type="text"
												label={T()("common.alt")}
												errors={undefined}
												disabled={true}
											/>
										</Show>
									</Show>
								)}
							</For>
							<Select
								id="media-folder"
								value={media.data?.data.folderId ?? undefined}
								onChange={() => {}}
								name="media-folder"
								options={folderOptions()}
								label={T()("common.folder")}
								required={false}
								errors={undefined}
								disabled={true}
							/>
							<Switch
								id="public"
								value={media.data?.data.public ?? true}
								onChange={() => {}}
								name="public"
								disabled={true}
								label={T()("common.publicly.available")}
								tooltip={T()("media.visibility.public.description")}
								trueLabel={T()("common.public")}
								falseLabel={T()("common.private")}
							/>
						</Show>
						<Show when={activeTab() === "meta" && props.id !== undefined}>
							<DetailsList
								class="mb-6 last:mb-0"
								items={[
									{
										label: T()("common.file.size"),
										value: helpers.bytesToSize(
											media.data?.data.meta.fileSize ?? 0,
										),
									},
									{
										label: T()("common.dimensions"),
										value: dimensions(),
										show: dimensions() !== null,
									},
									{
										label: T()("common.duration"),
										value: duration(),
										show: duration() !== null,
									},
									{
										label: T()("common.average.colour"),
										value: imageMeta()?.averageColor,
										show: Boolean(imageMeta()?.averageColor),
									},
									{
										label: T()("common.focal.point"),
										value: focalPoint(),
										show: focalPoint() !== null,
									},
									{
										label: T()("common.extension"),
										value: media.data?.data.meta.extension,
									},
									{
										label: T()("common.mime.type"),
										value: media.data?.data.meta.mimeType,
									},
									{
										label: T()("common.created.at"),
										value: dateHelpers.formatDate(media.data?.data.createdAt),
									},
									{
										label: T()("common.updated.at"),
										value: dateHelpers.formatDate(media.data?.data.updatedAt),
									},
								]}
							/>
						</Show>
					</Drawer.Body>
					<Drawer.Footer>
						<Drawer.Actions>
							<Button
								size="md"
								variant="outline"
								onClick={() => props.state.setOpen(false)}
							>
								{T()("common.close")}
							</Button>
						</Drawer.Actions>
					</Drawer.Footer>
				</>
			)}
		</Drawer.Root>
	);
};

export default ViewMediaDrawer;
