import type { ErrorResponse, Media, User } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	Show,
} from "solid-js";
import { Input } from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import { useCreateMedia } from "@/hooks/actions";
import useSingleFileUpload from "@/hooks/useSingleFileUpload";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import { uploadMediaFile } from "@/utils/upload-session";

interface CreateUpdateProfilePicturePanelProps {
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		media: User["profilePicture"];
		userId?: number;
	};
}

const CreateUpdateProfilePicturePanel: Component<
	CreateUpdateProfilePicturePanelProps
> = (props) => {
	// ------------------------------
	// State & Hooks
	const [uploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [uploadLoading, setUploadLoading] = createSignal(false);
	const [uploadProgress, setUploadProgress] = createSignal(0);
	const createMedia = useCreateMedia();

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
		noMargin: false,
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
	const mutateIsLoading = createMemo(() => {
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
			},
			{
				key: createMedia.state.key(),
				title: createMedia.state.title(),
				alt: createMedia.state.alt(),
			},
		);

		return {
			changed: MediaFile.getFile() ? true : changed,
			data,
		};
	});
	const mutateIsDisabled = createMemo(() => {
		if (panelMode() === "create") return MediaFile.getFile() === null;
		return !updateData().changed;
	});
	const panelContent = createMemo(() => {
		return {
			title:
				panelMode() === "create"
					? T()("set_profile_picture")
					: T()("update_profile_picture"),
			submit: panelMode() === "create" ? T()("set") : T()("update"),
		};
	});

	// ---------------------------------
	// Functions
	function inputError(index: number) {
		const errors = getBodyError("translations", mutateErrors())?.children;
		if (errors) return errors[index];
		return undefined;
	}
	function hydrateTranslations(translations?: Media["title"]) {
		return locales().map((locale) => ({
			localeCode: locale.code,
			value:
				translations?.find(
					(translation) => translation.localeCode === locale.code,
				)?.value ?? null,
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
				name: T()("media_upload_error"),
				message:
					error instanceof Error
						? error.message
						: T()("media_upload_error_description"),
			});
			return null;
		} finally {
			setUploadLoading(false);
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
			title: toProfileTranslations(createMedia.state.title()),
			alt: toProfileTranslations(createMedia.state.alt()),
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
			MediaFile.setCurrentFile({
				name: profilePicture.fileName ?? profilePicture.key,
				url: `${profilePicture.url}?preset=thumbnail&format=webp`,
				type: profilePicture.type,
			});
		}
	}

	// ---------------------------------
	// Handlers
	const onSubmit = async () => {
		const imageMeta = await MediaFile.getImageMeta();
		const success = await updateProfilePicture(MediaFile.getFile(), imageMeta);
		if (!success) return;
		props.state.setOpen(false);
	};

	// ---------------------------------
	// Effects
	createEffect(
		on([profilePictureMedia, () => props.state.open], ([_, open]) => {
			if (open) hydrateProfilePictureState();
		}),
	);

	// ---------------------------------
	// Render
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: false,
				isError: false,
			}}
			mutateState={{
				isLoading: mutateIsLoading(),
				errors: mutateErrors(),
				isDisabled: mutateIsDisabled(),
			}}
			callbacks={{
				onSubmit,
				reset: () => {
					createMedia.reset();
					MediaFile.reset();
					setUploadErrors(undefined);
					setUploadProgress(0);
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
					<div class="mt-6 border-b border-border mb-4">
						<div class="flex flex-row flex-wrap items-center gap-4">
							<button
								type="button"
								class="border-b-2 -mb-px text-sm font-medium pb-2 focus:outline-hidden ring-inset focus-visible:ring-1 ring-primary-base transition-colors duration-200 border-primary-base text-title"
							>
								{T()("details")}
							</button>
						</div>
					</div>
					<For each={locales()}>
						{(locale, index) => (
							<Show when={locale.code === lang?.contentLocale()}>
								<Input
									id={`name-${locale.code}`}
									value={
										helpers.getTranslation(
											createMedia.state.title(),
											locale.code,
										) || ""
									}
									onChange={(val) => {
										helpers.updateTranslation(createMedia.setTitle, {
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
												createMedia.state.alt(),
												locale.code,
											) || ""
										}
										onChange={(val) => {
											helpers.updateTranslation(createMedia.setAlt, {
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
				</>
			)}
		</Panel>
	);
};

export default CreateUpdateProfilePicturePanel;
