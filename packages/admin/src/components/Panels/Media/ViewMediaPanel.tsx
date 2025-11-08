import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import SectionHeading from "@/components/Blocks/SectionHeading";
import { Checkbox, Input, Select } from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import AspectRatio from "@/components/Partials/AspectRatio";
import DetailsList from "@/components/Partials/DetailsList";
import MediaPreview from "@/components/Partials/MediaPreview";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
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

const ViewMediaPanel: Component<ViewMediaPanelProps> = (props) => {
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
	const showAltInput = createMemo(() => {
		return media.data?.data.type === "image";
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

		return [{ value: undefined, label: T()("no_folder") }, ...sorted];
	});
	const hasTranslationErrors = createMemo(() => false);
	const panelContent = createMemo(() => {
		return {
			title: T()("view_media_panel_title"),
			description: T()("view_media_panel_description"),
		};
	});
	const panelFetchState = createMemo(() => {
		return {
			isLoading: media.isLoading || foldersHierarchy.isLoading,
			isError: media.isError || foldersHierarchy.isError,
		};
	});

	// ---------------------------------
	// Render
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={panelFetchState()}
			options={{
				padding: "24",
				hideFooter: true,
			}}
			callbacks={{
				reset: () => {},
			}}
			copy={panelContent()}
			langauge={{
				contentLocale: true,
				hascontentLocaleError: hasTranslationErrors(),
				useDefaultcontentLocale: false,
			}}
		>
			{(lang) => (
				<>
					{/* Preview */}
					<AspectRatio
						ratio="16:9"
						innerClass={"overflow-hidden mb-4 rounded-md"}
					>
						<Show when={media.data?.data} keyed>
							{(item) => (
								<MediaPreview
									media={{ type: item.type, url: item.url }}
									alt={
										helpers.getTranslation(item.alt, lang?.contentLocale()) ||
										helpers.getTranslation(item.title, lang?.contentLocale()) ||
										""
									}
								/>
							)}
						</Show>
					</AspectRatio>
					<SectionHeading title={T()("details")} />
					<Checkbox
						id="public"
						value={media.data?.data.public ?? true}
						onChange={() => {}}
						name="public"
						copy={{
							label: T()("publicly_available"),
							tooltip: T()("media_public_description"),
						}}
					/>
					<For each={locales()}>
						{(locale) => (
							<Show when={locale.code === lang?.contentLocale()}>
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
									copy={{
										label: T()("name_lang", {
											code: locale.code,
										}),
									}}
									errors={undefined}
									autoComplete="off"
									disabled={true}
								/>
								<Show when={showAltInput()}>
									<Input
										id={`alt-${locale.code}`}
										value={
											helpers.getTranslation(
												media.data?.data.alt,
												locale.code,
											) || ""
										}
										onChange={() => {}}
										name={`alt-${locale.code}`}
										type="text"
										copy={{
											label: T()("alt_lang", {
												code: locale.code,
											}),
										}}
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
						copy={{ label: T()("folder") }}
						required={false}
						errors={undefined}
						noMargin={false}
						noClear={true}
						disabled={true}
					/>
					<Show when={props.id !== undefined}>
						<SectionHeading title={T()("meta")} />
						<DetailsList
							type="text"
							items={[
								{
									label: T()("file_size"),
									value: helpers.bytesToSize(
										media.data?.data.meta.fileSize ?? 0,
									),
								},
								{
									label: T()("dimensions"),
									value: `${media.data?.data.meta.width} x ${media.data?.data.meta.height}`,
									show: media.data?.data.type === "image",
								},
								{
									label: T()("extension"),
									value: media.data?.data.meta.extension,
								},
								{
									label: T()("mime_type"),
									value: media.data?.data.meta.mimeType,
								},
								{
									label: T()("created_at"),
									value: dateHelpers.formatDate(media.data?.data.createdAt),
								},
								{
									label: T()("updated_at"),
									value: dateHelpers.formatDate(media.data?.data.updatedAt),
								},
							]}
						/>
					</Show>
				</>
			)}
		</Panel>
	);
};

export default ViewMediaPanel;
