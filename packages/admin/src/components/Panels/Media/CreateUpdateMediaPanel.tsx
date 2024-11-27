import T from "@/translations";
import {
	type Component,
	type Accessor,
	createMemo,
	Show,
	For,
	createEffect,
} from "solid-js";
import api from "@/services/api";
import useSingleFileUpload from "@/hooks/useSingleFileUpload";
import { useCreateMedia, useUpdateMedia } from "@/hooks/actions";
import helpers from "@/utils/helpers";
import dateHelpers from "@/utils/date-helpers";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import contentLocaleStore from "@/store/contentLocaleStore";
import Panel from "@/components/Groups/Panel";
import Form from "@/components/Groups/Form";
import SectionHeading from "@/components/Blocks/SectionHeading";
import DetailsList from "@/components/Partials/DetailsList";

interface CreateUpdateMediaPanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
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
			},
			{
				key: state?.key(),
				title: state?.title(),
				alt: state?.alt(),
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
			return undefined;
		}
		return {
			isLoading: media.isLoading,
			isError: media.isError,
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
		const mutation =
			panelMode() === "create"
				? createMedia.createMedia
				: updateMedia?.updateMedia;
		if (!mutation) return;

		const success = await mutation(MediaFile.getFile());

		if (!success) return;

		props.state.setOpen(false);
	};

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (media.isSuccess && panelMode() === "update") {
			updateMedia?.setTitle(media.data?.data.title || []);
			updateMedia?.setAlt(media.data?.data.alt || []);
			MediaFile.reset();
			MediaFile.setCurrentFile({
				name: media.data.data.key,
				url: media.data?.data.url
					? `${media.data.data.url}?width=400`
					: undefined,
				type: media.data?.data.type || undefined,
			});
		}
	});

	// ---------------------------------
	// Render
	return (
		<Panel.Root
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
				padding: "30",
			}}
		>
			{(lang) => (
				<>
					<MediaFile.Render />
					<For each={locales()}>
						{(locale, index) => (
							<Show when={locale.code === lang?.contentLocale()}>
								<SectionHeading
									title={T()("details_lang", {
										code: locale.code,
									})}
								/>
								<Form.Input
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
										label: T()("name"),
									}}
									errors={getErrorObject(inputError(index())?.name)}
									autoComplete="off"
									theme="full"
								/>
								<Show when={showAltInput()}>
									<Form.Input
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
											label: T()("alt"),
										}}
										errors={getErrorObject(inputError(index())?.alt)}
										theme="full"
									/>
								</Show>
							</Show>
						)}
					</For>
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
		</Panel.Root>
	);
};

export default CreateUpdateMediaPanel;
