import type { ErrorResponse, Media, User } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
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
	profilePicture?: {
		media: User["profilePicture"];
		userId?: number;
	};
	callbacks?: {
		onSuccess?: (_media: Media) => void;
	};
}

const CreateUpdateMediaPanel: Component<CreateUpdateMediaPanelProps> = (
	props,
) => {
	// ------------------------------
	// State & Hooks
	const [uploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const createMedia = useCreateMedia();
	const updateMedia = props.id ? useUpdateMedia(props.id) : null;
	const isProfilePicture = createMemo(() => props.profilePicture !== undefined);
	const locales = createMemo(() => contentLocaleStore.get.locales);
	const profilePictureMedia = createMemo(
		() => props.profilePicture?.media ?? null,
	);
	const panelMode = createMemo(() => {
		if (props.profilePicture) {
			return profilePictureMedia() === null ? "create" : "update";
		}
		return props.id === undefined ? "create" : "update";
	});
	const MediaFile = useSingleFileUpload({
		id: "file",
		disableRemoveCurrent: true,
		name: "file",
		required: true,
		accept: isProfilePicture() ? "image/*" : undefined,
		errors: () => mutateErrors(),
		noMargin: false,
	});
	const accountGetPresignedUrl = api.account.useGetProfilePicturePresignedUrl();
	const userGetPresignedUrl = api.users.useGetProfilePicturePresignedUrl();
	const accountUpdateProfilePicture = api.account.useUpdateProfilePicture();
	const userUpdateProfilePicture = api.users.useUpdateProfilePicture();

	// ---------------------------------
	// Queries
	const media = api.media.useGetSingle({
		queryParams: {
			location: {
				id: props.id as Accessor<number | undefined>,
			},
		},
		enabled: () =>
			!isProfilePicture() && panelMode() === "update" && props.state.open,
	});

	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
		enabled: () => !isProfilePicture(),
	});

	// ---------------------------------
	// Memos
	const showAltInput = createMemo(() => {
		if (MediaFile.getFile() !== null) {
			const type = helpers.getMediaType(MediaFile.getMimeType());
			return type === "image";
		}
		if (isProfilePicture()) {
			return (
				panelMode() === "update" && profilePictureMedia()?.type === "image"
			);
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
		if (isProfilePicture()) {
			return (
				accountGetPresignedUrl.action.isPending ||
				userGetPresignedUrl.action.isPending ||
				accountUpdateProfilePicture.action.isPending ||
				userUpdateProfilePicture.action.isPending
			);
		}
		return panelMode() === "create"
			? createMedia.isLoading()
			: updateMedia?.isLoading() || false;
	});
	const mutateErrors = createMemo(() => {
		if (isProfilePicture()) {
			return (
				accountGetPresignedUrl.errors() ||
				userGetPresignedUrl.errors() ||
				accountUpdateProfilePicture.errors() ||
				userUpdateProfilePicture.errors() ||
				uploadErrors()
			);
		}
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
		if (isProfilePicture()) return createMedia;
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
				title: isProfilePicture()
					? recordToTranslations(profilePictureMedia()?.title)
					: media.data?.data.title || [],
				alt: isProfilePicture()
					? recordToTranslations(profilePictureMedia()?.alt)
					: media.data?.data.alt || [],
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
		if (isProfilePicture() && panelMode() === "update") {
			return !updateData().changed;
		}
		if (panelMode() === "create") {
			return MediaFile.getFile() === null;
		}
		return !updateData().changed;
	});

	const panelContent = createMemo(() => {
		if (isProfilePicture()) {
			return {
				title:
					panelMode() === "create"
						? T()("set_profile_picture")
						: T()("update_profile_picture"),
				submit: panelMode() === "create" ? T()("set") : T()("update"),
			};
		}
		if (panelMode() === "create") {
			return {
				title: T()("create_media_panel_title"),
				submit: T()("upload"),
			};
		}
		return {
			title: T()("update_media_panel_title"),
			submit: T()("update"),
		};
	});
	const panelFetchState = createMemo(() => {
		if (isProfilePicture()) {
			return {
				isLoading: false,
				isError: false,
			};
		}
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
	function inputError(index: number) {
		const errors = getBodyError("translations", mutateErrors)?.children;
		if (errors) return errors[index];
		return undefined;
	}
	function recordToTranslations(record?: Record<string, string>) {
		return locales().map((locale) => ({
			localeCode: locale.code,
			value: record?.[locale.code] ?? null,
		}));
	}
	function toProfileTranslations(translations?: Media["title"]) {
		return (translations || [])
			.filter((translation) => translation.localeCode !== null)
			.map((translation) => ({
				localeCode: translation.localeCode as string,
				value: translation.value,
			}));
	}
	function setFileError(message: string) {
		setUploadErrors({
			status: 400,
			name: T()("media_upload_error"),
			message,
			errors: {
				body: {
					file: {
						message,
					},
				},
			},
		});
	}
	async function uploadProfilePictureFile(file: File) {
		if (!file.type.startsWith("image/")) {
			setFileError(T()("profile_picture_image_only"));
			return null;
		}

		try {
			setUploadErrors(undefined);
			const presignedUrl =
				props.profilePicture?.userId !== undefined
					? await userGetPresignedUrl.action.mutateAsync({
							userId: props.profilePicture.userId,
							body: {
								fileName: file.name,
								mimeType: file.type,
							},
						})
					: await accountGetPresignedUrl.action.mutateAsync({
							body: {
								fileName: file.name,
								mimeType: file.type,
							},
						});

			const response = await fetch(presignedUrl.data.url, {
				method: "PUT",
				body: file,
				headers: {
					...(file.type ? { "content-type": file.type } : {}),
					...presignedUrl.data.headers,
				},
			});

			let bodyMessage = "";
			if (response.headers.get("content-type")?.includes("application/json")) {
				const body = await response.json();
				bodyMessage = body?.message || "";
			}

			if (!response.ok) {
				setUploadErrors({
					status: response.status,
					name: T()("media_upload_error"),
					message: T()("media_upload_error_description"),
					errors: {
						body: {
							file: {
								message: bodyMessage || "",
							},
						},
					},
				});
				return null;
			}

			return presignedUrl.data.key;
		} catch (error) {
			setUploadErrors({
				status: 500,
				name: T()("media_upload_error"),
				message:
					error instanceof Error
						? error.message
						: T()("media_upload_error_description"),
			});
			return null;
		}
	}
	async function updateProfilePicture(
		file: File | null,
		imageMeta: Awaited<ReturnType<typeof MediaFile.getImageMeta>>,
	) {
		let key: string | null = null;
		if (file) {
			key = await uploadProfilePictureFile(file);
			if (!key) return false;
		}

		const body = {
			key: key ?? undefined,
			fileName: file?.name,
			width: imageMeta?.width,
			height: imageMeta?.height,
			blurHash: imageMeta?.blurHash,
			averageColor: imageMeta?.averageColor,
			isDark: imageMeta?.isDark,
			isLight: imageMeta?.isLight,
			title: toProfileTranslations(targetState()?.title()),
			alt: toProfileTranslations(targetState()?.alt()),
		};

		if (props.profilePicture?.userId !== undefined) {
			await userUpdateProfilePicture.action.mutateAsync({
				userId: props.profilePicture.userId,
				body,
			});
			return true;
		}

		await accountUpdateProfilePicture.action.mutateAsync(body);
		return true;
	}
	function hydrateProfilePictureState() {
		const profilePicture = profilePictureMedia();

		createMedia.setTitle(recordToTranslations(profilePicture?.title));
		createMedia.setAlt(recordToTranslations(profilePicture?.alt));
		createMedia.setFolderId(null);
		createMedia.setPublic(true);
		MediaFile.reset();
		if (profilePicture) {
			MediaFile.setCurrentFile({
				name: profilePicture.fileName ?? profilePicture.key,
				url:
					profilePicture.type === "image"
						? `${profilePicture.url}?preset=thumbnail&format=webp`
						: profilePicture.url,
				type: profilePicture.type,
			});
		}
	}

	// ---------------------------------
	// Handlers
	const onSubmit = async () => {
		const imageMeta = await MediaFile.getImageMeta();

		if (isProfilePicture()) {
			const success = await updateProfilePicture(
				MediaFile.getFile(),
				imageMeta,
			);
			if (!success) return;
			props.state.setOpen(false);
			return;
		}

		if (panelMode() === "create") {
			const media = await createMedia.createMedia(
				MediaFile.getFile(),
				imageMeta,
			);

			if (media === null) return;

			props.callbacks?.onSuccess?.(media);
			props.state.setOpen(false);
		} else {
			const success = await updateMedia?.updateMedia(
				MediaFile.getFile(),
				imageMeta,
			);

			if (!success) return;

			props.state.setOpen(false);
		}
	};

	// ---------------------------------
	// Effects
	createEffect(
		on(
			[isProfilePicture, profilePictureMedia, () => props.state.open],
			([profilePictureMode, _, open]) => {
				if (profilePictureMode && open) {
					hydrateProfilePictureState();
				}
			},
		),
	);

	createEffect(() => {
		if (isProfilePicture()) return;
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
					setUploadErrors(undefined);
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
										label: T()("name"),
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
											label: T()("alt"),
										}}
										errors={getErrorObject(inputError(index())?.alt)}
									/>
								</Show>
							</Show>
						)}
					</For>
					<Show when={!isProfilePicture()}>
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
					</Show>
					<Show when={!isProfilePicture() && props.id !== undefined}>
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
