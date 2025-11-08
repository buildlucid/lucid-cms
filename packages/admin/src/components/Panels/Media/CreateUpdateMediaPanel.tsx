import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	For,
	Show,
} from "solid-js";
import SectionHeading from "@/components/Blocks/SectionHeading";
import { Checkbox, Input, Select } from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import DetailsList from "@/components/Partials/DetailsList";
import { useCreateMedia, useUpdateMedia } from "@/hooks/actions";
import useSingleFileUpload from "@/hooks/useSingleFileUpload";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface CreateUpdateMediaPanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		parentFolderId: Accessor<number | string | undefined>;
	};
}

const CreateUpdateMediaPanel: Component<CreateUpdateMediaPanelProps> = (
	props,
) => {
	// ------------------------------
	// State
	const panelMode = createMemo(() => {
		return props.id === undefined ? "create" : "update";
	});
	const createMedia = useCreateMedia();
	const updateMedia = props.id ? useUpdateMedia(props.id) : null;

	const MediaFile = useSingleFileUpload({
		id: "file",
		disableRemoveCurrent: true,
		name: "file",
		required: true,
		errors: panelMode() === "create" ? createMedia.errors : updateMedia?.errors,
		noMargin: false,
	});

	// ---------------------------------
	// Queries
	const media = api.media.useGetSingle({
		queryParams: {
			location: {
				id: props.id as Accessor<number | undefined>,
			},
		},
		enabled: () => panelMode() === "update" && props.state.open,
	});

	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
	});

	// ---------------------------------
	// Memos
	const locales = createMemo(() => contentLocaleStore.get.locales);

	const showAltInput = createMemo(() => {
		if (MediaFile.getFile() !== null) {
			const type = helpers.getMediaType(MediaFile.getMimeType());
			return type === "image";
		}
		return panelMode() === "create" ? false : media.data?.data.type === "image";
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

	const resolvedDefaultFolderId = createMemo(() => {
		const d = props.state.parentFolderId();
		if (d === undefined || d === "") return undefined;
		return typeof d === "string" ? Number.parseInt(d, 10) : d;
	});

	const mutateIsLoading = createMemo(() => {
		return panelMode() === "create"
			? createMedia.isLoading()
			: updateMedia?.isLoading() || false;
	});
	const mutateErrors = createMemo(() => {
		return panelMode() === "create"
			? createMedia.errors()
			: updateMedia?.errors();
	});

	const hasTranslationErrors = createMemo(() => {
		const titleErrors = getBodyError("title", mutateErrors)?.children;
		const altErrors = getBodyError("alt", mutateErrors)?.children;
		return (
			(titleErrors && titleErrors.length > 0) ||
			(altErrors && altErrors.length > 0)
		);
	});

	const targetAction = createMemo(() => {
		return panelMode() === "create" ? createMedia : updateMedia;
	});
	const targetState = createMemo(() => {
		return targetAction()?.state;
	});
	const updateData = createMemo(() => {
		const state = targetState();
		const { changed, data } = helpers.updateData(
			{
				key: undefined,
				title: media.data?.data.title || [],
				alt: media.data?.data.alt || [],
				folderId: media.data?.data.folderId ?? null,
				public: media.data?.data.public ?? true,
			},
			{
				key: state?.key(),
				title: state?.title(),
				alt: state?.alt(),
				folderId: state?.folderId(),
				public: state?.public(),
			},
		);

		let resChanged = changed;
		if (MediaFile.getFile()) resChanged = true;

		return {
			changed: resChanged,
			data: data,
		};
	});
	const mutateIsDisabled = createMemo(() => {
		if (panelMode() === "create") {
			return MediaFile.getFile() === null;
		}
		return !updateData().changed;
	});

	const panelContent = createMemo(() => {
		if (panelMode() === "create") {
			return {
				title: T()("create_media_panel_title"),
				description: T()("create_media_panel_description"),
				submit: T()("create"),
			};
		}
		return {
			title: T()("update_media_panel_title"),
			description: T()("update_media_panel_description"),
			submit: T()("update"),
		};
	});
	const panelFetchState = createMemo(() => {
		if (panelMode() === "create") {
			return {
				isLoading: foldersHierarchy.isLoading,
				isError: foldersHierarchy.isError,
			};
		}
		return {
			isLoading: media.isLoading || foldersHierarchy.isLoading,
			isError: media.isError || foldersHierarchy.isError,
		};
	});

	// ---------------------------------
	// Functions
	const inputError = (index: number) => {
		const errors = getBodyError("translations", mutateErrors)?.children;
		if (errors) return errors[index];
		return undefined;
	};
	const onSubmit = async () => {
		const imageMeta = await MediaFile.getImageMeta();

		const mutation =
			panelMode() === "create"
				? createMedia.createMedia
				: updateMedia?.updateMedia;
		if (!mutation) return;

		const success = await mutation(MediaFile.getFile(), imageMeta);

		if (!success) return;

		props.state.setOpen(false);
	};

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (media.isSuccess && panelMode() === "update") {
			updateMedia?.setTitle(media.data?.data.title || []);
			updateMedia?.setAlt(media.data?.data.alt || []);
			updateMedia?.setFolderId(media.data?.data.folderId ?? null);
			updateMedia?.setPublic(media.data?.data.public ?? true);
			MediaFile.reset();
			MediaFile.setCurrentFile({
				name: media.data.data.key,
				url: media.data?.data.url
					? media.data?.data.type === "image"
						? `${media.data.data.url}?preset=thumbnail&format=webp`
						: media.data.data.url
					: undefined,
				type: media.data?.data.type || undefined,
			});
		}
	});

	createEffect(() => {
		if (panelMode() === "create") {
			const newFolderId = resolvedDefaultFolderId();
			if (createMedia.state.folderId() !== newFolderId) {
				createMedia.setFolderId(newFolderId);
			}
		}
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
			mutateState={{
				isLoading: mutateIsLoading(),
				errors: mutateErrors(),
				isDisabled: mutateIsDisabled(),
			}}
			callbacks={{
				onSubmit: onSubmit,
				reset: () => {
					createMedia.reset();
					updateMedia?.reset();
					MediaFile.reset();
				},
			}}
			copy={panelContent()}
			langauge={{
				contentLocale: true,
				hascontentLocaleError: hasTranslationErrors(),
				useDefaultcontentLocale: panelMode() === "create",
			}}
			options={{
				padding: "24",
			}}
		>
			{(lang) => (
				<>
					<MediaFile.Render />
					<SectionHeading title={T()("details")} />
					<Checkbox
						id="public"
						value={targetState()?.public() ?? true}
						onChange={(val) => {
							targetAction()?.setPublic(val);
						}}
						name="public"
						copy={{
							label: T()("publicly_available"),
							tooltip: T()("media_public_description"),
						}}
						errors={getBodyError("featured", mutateErrors())}
					/>
					<For each={locales()}>
						{(locale, index) => (
							<Show when={locale.code === lang?.contentLocale()}>
								<Input
									id={`name-${locale.code}`}
									value={
										helpers.getTranslation(
											targetState()?.title(),
											locale.code,
										) || ""
									}
									onChange={(val) => {
										helpers.updateTranslation(targetAction()?.setTitle, {
											localeCode: locale.code,
											value: val,
										});
									}}
									name={`name-${locale.code}`}
									type="text"
									copy={{
										label: T()("name_lang", {
											code: locale.code,
										}),
									}}
									errors={getErrorObject(inputError(index())?.name)}
									autoComplete="off"
								/>
								<Show when={showAltInput()}>
									<Input
										id={`alt-${locale.code}`}
										value={
											helpers.getTranslation(
												targetState()?.alt(),
												locale.code,
											) || ""
										}
										onChange={(val) => {
											helpers.updateTranslation(targetAction()?.setAlt, {
												localeCode: locale.code,
												value: val,
											});
										}}
										name={`alt-${locale.code}`}
										type="text"
										copy={{
											label: T()("alt_lang", {
												code: locale.code,
											}),
										}}
										errors={getErrorObject(inputError(index())?.alt)}
									/>
								</Show>
							</Show>
						)}
					</For>
					<Select
						id="media-folder"
						value={targetState()?.folderId() ?? undefined}
						onChange={(val) => {
							const id =
								typeof val === "string" ? Number.parseInt(val, 10) : val;
							targetAction()?.setFolderId(id);
						}}
						name="media-folder"
						options={folderOptions()}
						copy={{ label: T()("folder") }}
						required={false}
						errors={getBodyError("folderId", mutateErrors())}
						noMargin={false}
						noClear={true}
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

export default CreateUpdateMediaPanel;
