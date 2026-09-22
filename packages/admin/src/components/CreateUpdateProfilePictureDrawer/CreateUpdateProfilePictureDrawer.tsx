import type { ErrorResponse, Media, MediaCropState, User } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Textarea from "@/components/Textarea/Textarea";
import { useCreateMedia } from "@/hooks/useCreateMedia/useCreateMedia";
import useMediaAltGeneration from "@/hooks/useMediaAltGeneration/useMediaAltGeneration";
import useMediaImageGeneration from "@/hooks/useMediaImageGeneration/useMediaImageGeneration";
import useSingleFileUpload from "@/hooks/useSingleFileUpload/useSingleFileUpload";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import { resolveStoredImageCropSource } from "@/utils/image-crop";
import mediaUrl from "@/utils/media-url";
import {
	getTranslation,
	recordToTranslations,
	updateTranslation,
} from "@/utils/translation-helpers";
import { uploadMediaFile } from "@/utils/upload-session";

interface CreateUpdateProfilePicturePanelProps {
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		media: User["profilePicture"];
		userId?: number;
	};
}

const CreateUpdateProfilePictureDrawer: Component<
	CreateUpdateProfilePicturePanelProps
> = (props) => {
	// ------------------------------
	// State & Hooks
	const [uploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [uploadLoading, setUploadLoading] = createSignal(false);
	const [uploadProgress, setUploadProgress] = createSignal(0);
	const createMedia = useCreateMedia();
	const profileAltGeneration = useMediaAltGeneration();
	const profileImageGeneration = useMediaImageGeneration();

	const MediaFile = useSingleFileUpload({
		id: "file",
		disableRemoveCurrent: true,
		name: "file",
		required: true,
		accept: "image/*",
		errors: () => mutateErrors(),
		progress: () => ({
			active: uploadLoading(),
			value: uploadProgress(),
		}),
		imageGeneration: {
			enabled: () => true,
			disabled: () => coreMutateIsLoading(),
			onSetFile: () => {
				setUploadErrors(undefined);
			},
		},
		imageCrop: {
			enabled: () => true,
			disabled: () => coreMutateIsLoading(),
			onSetFile: () => {
				setUploadErrors(undefined);
			},
		},
	});

	// ---------------------------------
	// Queries & Mutations
	const accountCreateUploadSession =
		api.account.useCreateProfilePictureUploadSession();
	const userCreateUploadSession =
		api.users.useCreateProfilePictureUploadSession();
	const accountUpdateProfilePicture = api.account.useUpdateProfilePicture();
	const userUpdateProfilePicture = api.users.useUpdateProfilePicture();

	// ---------------------------------
	// Memos
	const locales = createMemo(() => contentLocaleStore.get.locales);
	const editableLocales = createMemo(() =>
		locales().length
			? locales().map((locale) => ({ code: locale.code }))
			: [{ code: null }],
	);
	const profilePictureMedia = createMemo(() => props.state.media ?? null);

	const panelMode = createMemo(() =>
		profilePictureMedia() === null ? "create" : "update",
	);
	const showAltInput = createMemo(() => {
		if (MediaFile.getFile() !== null) {
			const type = helpers.getMediaType(MediaFile.getMimeType());
			return type === "image";
		}
		return panelMode() === "update" && profilePictureMedia()?.type === "image";
	});
	const coreMutateIsLoading = createMemo(() => {
		return (
			accountCreateUploadSession.action.isPending ||
			userCreateUploadSession.action.isPending ||
			accountUpdateProfilePicture.action.isPending ||
			userUpdateProfilePicture.action.isPending ||
			uploadLoading()
		);
	});
	const mutateErrors = createMemo(() => {
		return (
			accountCreateUploadSession.errors() ||
			userCreateUploadSession.errors() ||
			accountUpdateProfilePicture.errors() ||
			userUpdateProfilePicture.errors() ||
			uploadErrors()
		);
	});
	const hasTranslationErrors = createMemo(() => {
		const titleErrors = getBodyError("title", mutateErrors())?.children;
		const altErrors = getBodyError("alt", mutateErrors())?.children;
		return (
			(titleErrors && titleErrors.length > 0) ||
			(altErrors && altErrors.length > 0)
		);
	});
	const updateData = createMemo(() => {
		const { changed, data } = helpers.updateData(
			{
				key: undefined,
				title: hydrateTranslations(profilePictureMedia()?.title),
				alt: hydrateTranslations(profilePictureMedia()?.alt),
				focalPoint: profilePictureMedia()?.meta.focalPoint ?? null,
			},
			{
				key: createMedia.state.key(),
				title: createMedia.state.title(),
				alt: createMedia.state.alt(),
				focalPoint: MediaFile.getFocalPoint(),
			},
		);

		return {
			changed:
				MediaFile.getFile() ||
				MediaFile.getCropFile() ||
				MediaFile.getCropRemoved()
					? true
					: changed,
			data,
		};
	});
	const mutateIsDisabled = createMemo(() => {
		if (panelMode() === "create") return MediaFile.getFile() === null;
		return !updateData().changed;
	});
	const profileAltImage = createMemo(() => {
		if (!showAltInput()) return null;

		const file = MediaFile.getFile();
		if (file) return { file, filename: file.name };

		const profilePicture = profilePictureMedia();
		if (profilePicture?.url) {
			return {
				url: profilePicture.url,
				filename: profilePicture.fileName ?? profilePicture.key,
			};
		}

		return null;
	});
	const ProfileAltGenerationButton = profileAltGeneration.createActionButton({
		image: profileAltImage,
		media: () => ({
			id: profilePictureMedia()?.id,
			name: createMedia.state.title(),
			alt: createMedia.state.alt(),
		}),
		locales,
		setAlt: createMedia.setAlt,
		disabled: coreMutateIsLoading,
	});
	const mutateIsLoading = createMemo(() => {
		return (
			coreMutateIsLoading() ||
			profileAltGeneration.isLoading() ||
			profileImageGeneration.isLoading()
		);
	});

	// ---------------------------------
	// Functions
	function inputError(index: number) {
		const errors = getBodyError("translations", mutateErrors())?.children;
		if (errors) return errors[index];
		return undefined;
	}
	function hydrateTranslations(translations?: Media["title"]) {
		return recordToTranslations(locales(), translations);
	}
	function setFileError(message: string) {
		setUploadErrors({
			status: 400,
			name: T()("media.upload.error.title"),
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
			setFileError(T()("account.profile.picture.image.only"));
			return null;
		}

		try {
			setUploadErrors(undefined);
			setUploadLoading(true);
			setUploadProgress(0);
			const uploadRes = await uploadMediaFile({
				file,
				scope: `profile-picture:${props.state.userId ?? "me"}`,
				start: () =>
					props.state.userId !== undefined
						? userCreateUploadSession.action.mutateAsync({
								userId: props.state.userId,
								body: {
									fileName: file.name,
									mimeType: file.type,
									size: file.size,
								},
							})
						: accountCreateUploadSession.action.mutateAsync({
								body: {
									fileName: file.name,
									mimeType: file.type,
									size: file.size,
								},
							}),
				onProgress: setUploadProgress,
			});
			if (uploadRes.error) {
				setUploadErrors(uploadRes.error);
				return null;
			}
			return uploadRes.data;
		} catch (error) {
			setUploadErrors({
				status: 500,
				name: T()("media.upload.error.title"),
				message:
					error instanceof Error
						? error.message
						: T()("media.upload.error.description"),
			});
			return null;
		} finally {
			setUploadLoading(false);
		}
	}
	async function updateProfilePicture(
		file: File | null,
		imageMeta: Awaited<ReturnType<typeof MediaFile.getImageMeta>>,
		cropImageMeta: Awaited<ReturnType<typeof MediaFile.getCropImageMeta>>,
	) {
		let key: string | null = null;
		if (file) {
			key = await uploadProfilePictureFile(file);
			if (!key) return false;
		}
		const cropFile = MediaFile.getCropFile();
		const cropKey = cropFile ? await uploadProfilePictureFile(cropFile) : null;
		if (cropFile && !cropKey) return false;

		const body = {
			key: key ?? undefined,
			fileName: file?.name,
			width: imageMeta?.width,
			height: imageMeta?.height,
			focalPoint: MediaFile.getFocalPoint(),
			blurHash: imageMeta?.blurHash,
			averageColor: imageMeta?.averageColor,
			base64: imageMeta?.base64,
			isDark: imageMeta?.isDark,
			isLight: imageMeta?.isLight,
			origin: file
				? (MediaFile.getFileProvenance()?.origin ?? "human")
				: undefined,
			aiGenerationRequestId:
				MediaFile.getFileProvenance()?.aiGenerationRequestId,
			title: createMedia.state.title(),
			alt: createMedia.state.alt(),
			crop:
				cropFile && cropKey
					? {
							key: cropKey,
							fileName: cropFile.name,
							width: cropImageMeta?.width ?? 1,
							height: cropImageMeta?.height ?? 1,
							focalPoint: MediaFile.getFocalPoint(),
							blurHash: cropImageMeta?.blurHash,
							averageColor: cropImageMeta?.averageColor,
							base64: cropImageMeta?.base64,
							isDark: cropImageMeta?.isDark,
							isLight: cropImageMeta?.isLight,
							state: MediaFile.getCropState() as MediaCropState,
						}
					: MediaFile.getCropRemoved()
						? null
						: undefined,
		};

		if (props.state.userId !== undefined) {
			await userUpdateProfilePicture.action.mutateAsync({
				userId: props.state.userId,
				body,
			});
			return true;
		}

		await accountUpdateProfilePicture.action.mutateAsync(body);
		return true;
	}
	function hydrateProfilePictureState() {
		const profilePicture = profilePictureMedia();

		createMedia.setTitle(hydrateTranslations(profilePicture?.title));
		createMedia.setAlt(hydrateTranslations(profilePicture?.alt));
		createMedia.setFolderId(null);
		createMedia.setPublic(true);
		MediaFile.reset();
		if (profilePicture) {
			const file = profilePicture;
			const source = resolveStoredImageCropSource(file);
			MediaFile.setCurrentFile({
				name: file.fileName ?? file.key,
				url: mediaUrl(file, "thumbnail-medium"),
				focalPointUrl: mediaUrl(file, "thumbnail-large"),
				originalUrl: source.source.url,
				originalPreviewUrl: source.crop
					? mediaUrl(source.source, "thumbnail-medium")
					: undefined,
				originalFocalPointUrl: source.crop
					? mediaUrl(source.source, "thumbnail-large")
					: undefined,
				type: profilePicture.type,
				mimeType: source.source.meta.mimeType,
				origin: profilePicture.origin,
				width: source.source.meta.width,
				height: source.source.meta.height,
				focalPoint: file.meta.focalPoint ?? null,
				originalFocalPoint:
					source.source.meta.focalPoint ?? file.meta.focalPoint ?? null,
				crop: source.crop,
			});
		}
	}

	// ---------------------------------
	// Handlers
	const onSubmit = async () => {
		const imageMeta = await MediaFile.getImageMeta();
		const cropImageMeta = await MediaFile.getCropImageMeta();
		const success = await updateProfilePicture(
			MediaFile.getFile(),
			imageMeta,
			cropImageMeta,
		);
		if (!success) return;
		props.state.setOpen(false);
	};

	// ---------------------------------
	// Effects
	createEffect(
		on(
			[() => props.state.open, () => profilePictureMedia()?.id ?? null],
			([open]) => {
				if (open) hydrateProfilePictureState();
			},
		),
	);

	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			useDefaultLocale={panelMode() === "create"}
			onReset={() => {
				createMedia.reset();
				MediaFile.reset();
				setUploadErrors(undefined);
				setUploadProgress(0);
			}}
		>
			{(contentLocale) => (
				<>
					<Drawer.Header>
						<Drawer.Title>
							{panelMode() === "create"
								? T()("account.profile.picture.set")
								: T()("account.profile.picture.update")}
						</Drawer.Title>
						<Drawer.LocaleSelect hasError={hasTranslationErrors()} />
					</Drawer.Header>
					<Drawer.Form onSubmit={onSubmit}>
						<Drawer.Body class="flex flex-col gap-3">
							<MediaFile.Render />
							<div class="border-b border-border">
								<div class="flex flex-row flex-wrap items-center gap-4">
									<button
										type="button"
										class="border-b-2 -mb-px text-sm font-medium pb-2 focus:outline-hidden ring-inset focus-visible:ring-1 ring-primary-base transition-colors duration-200 border-primary-base text-title"
									>
										{T()("common.details")}
									</button>
								</div>
							</div>
							<For each={editableLocales()}>
								{(locale, index) => (
									<Show when={locale.code === (contentLocale() ?? null)}>
										<Input
											id={`name-${locale.code}`}
											value={
												getTranslation(
													createMedia.state.title(),
													locale.code,
												) || ""
											}
											onChange={(val) => {
												updateTranslation(createMedia.setTitle, {
													localeCode: locale.code,
													value: val,
												});
											}}
											name={`name-${locale.code}`}
											type="text"
											label={T()("common.name")}
											errors={getErrorObject(inputError(index())?.name)}
											autocomplete="off"
										/>
										<Show when={showAltInput()}>
											<Textarea
												id={`alt-${locale.code}`}
												value={
													getTranslation(
														createMedia.state.alt(),
														locale.code,
													) || ""
												}
												onChange={(val) => {
													updateTranslation(createMedia.setAlt, {
														localeCode: locale.code,
														value: val,
													});
												}}
												name={`alt-${locale.code}`}
												label={T()("common.alt")}
												errors={getErrorObject(inputError(index())?.alt)}
												rows={3}
												labelEnd={<ProfileAltGenerationButton />}
											/>
										</Show>
									</Show>
								)}
							</For>
						</Drawer.Body>
						<Drawer.Footer>
							<ErrorMessage theme="basic" message={mutateErrors()?.message} />
							<Drawer.Actions>
								<Button
									size="md"
									variant="outline"
									onClick={() => props.state.setOpen(false)}
								>
									{T()("common.close")}
								</Button>
								<Show
									when={
										panelMode() === "create"
											? T()("common.set")
											: T()("common.update")
									}
								>
									<Button
										type="submit"
										variant="primary"
										size="md"
										loading={mutateIsLoading()}
										disabled={mutateIsDisabled()}
									>
										{panelMode() === "create"
											? T()("common.set")
											: T()("common.update")}
									</Button>
								</Show>
							</Drawer.Actions>
						</Drawer.Footer>
					</Drawer.Form>
				</>
			)}
		</Drawer.Root>
	);
};

export default CreateUpdateProfilePictureDrawer;
