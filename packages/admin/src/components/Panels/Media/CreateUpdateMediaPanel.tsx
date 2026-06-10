import type { ErrorResponse, Media } from "@types";
import {
	FaSolidArrowRotateLeft,
	FaSolidArrowUpFromBracket,
	FaSolidBullseye,
	FaSolidCrop,
	FaSolidImage,
	FaSolidMagicWandSparkles,
	FaSolidMagnifyingGlass,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	Show,
	untrack,
} from "solid-js";
import { Checkbox, Input, Select, Textarea } from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import FocalPointEditor from "@/components/Modals/Media/FocalPointEditor";
import ImageCropEditor from "@/components/Modals/Media/ImageCropEditor";
import Button from "@/components/Partials/Button";
import DetailsList from "@/components/Partials/DetailsList";
import PanelTabs from "@/components/Partials/PanelTabs";
import Pill from "@/components/Partials/Pill";
import ProgressBar from "@/components/Partials/ProgressBar";
import { useCreateMedia, useUpdateMedia } from "@/hooks/actions";
import useMediaAltGeneration from "@/hooks/ai/useMediaAltGeneration";
import useMediaImageGeneration from "@/hooks/ai/useMediaImageGeneration";
import useSingleFileUpload from "@/hooks/useSingleFileUpload";
import api from "@/services/api";
import type { MediaImageGenerationTarget } from "@/store/aiModalsStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import {
	type ImageCropProvenance,
	type ImageCropSource,
	isSupportedCropMimeType,
} from "@/utils/image-crop";
import {
	getTranslation,
	recordToTranslations,
	updateTranslation,
} from "@/utils/translation-helpers";
import { captureVideoPosterFrame } from "@/utils/video-frame";

interface CreateUpdateMediaPanelProps {
	id?: Accessor<number | undefined>;
	initialFile?: Accessor<File | null | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		parentFolderId: Accessor<number | string | undefined>;
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
	let posterInputRef: HTMLInputElement | undefined;
	let posterCaptureId = 0;
	let autoCapturedPoster:
		| {
				posterFile: File;
		  }
		| undefined;
	const [uploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [posterAlt, setPosterAlt] = createSignal<Media["alt"]>([]);
	const [posterSnapshotLoading, setPosterSnapshotLoading] = createSignal(false);
	const [posterFocalEditorOpen, setPosterFocalEditorOpen] = createSignal(false);
	const [posterCropEditorOpen, setPosterCropEditorOpen] = createSignal(false);
	const [activePosterCropSource, setActivePosterCropSource] =
		createSignal<ImageCropSource | null>(null);
	const [activeTab, setActiveTab] = createSignal<"details" | "poster" | "meta">(
		"details",
	);
	const createMedia = useCreateMedia();
	const createPosterMedia = useCreateMedia();
	const updateMedia = props.id ? useUpdateMedia(props.id) : null;
	const mediaAltGeneration = useMediaAltGeneration();
	const mediaImageGeneration = useMediaImageGeneration();
	const posterImageGenerationTargetId = mediaImageGeneration.getTargetId();

	const MediaFile = useSingleFileUpload({
		id: "file",
		disableRemoveCurrent: true,
		name: "file",
		accept: () =>
			panelMode() === "update"
				? media.data?.data.type === "image"
					? "image/*"
					: media.data?.data.type === "video"
						? "video/*"
						: media.data?.data.type === "audio"
							? "audio/*"
							: undefined
				: undefined,
		required: true,
		errors: () => mutateErrors(),
		progress: () => ({
			active:
				Boolean(targetAction()?.isLoading()) && targetUploadProgress() > 0,
			value: targetUploadProgress(),
		}),
		noMargin: false,
		imageGeneration: {
			enabled: () => showMediaImageGenerationAction(),
			disabled: () => coreMutateIsLoading(),
			onSetFile: () => {
				setUploadErrors(undefined);
			},
		},
		imageCrop: {
			enabled: () => currentMediaType() === "image",
			disabled: () => coreMutateIsLoading(),
			onSetFile: () => {
				setUploadErrors(undefined);
			},
		},
	});

	const PosterFile = useSingleFileUpload({
		id: "poster",
		name: "file",
		accept: "image/*",
		errors: () => mutateErrors(),
		noMargin: false,
	});

	// ---------------------------------
	// Memos
	const panelMode = createMemo(() => {
		return props.id === undefined ? "create" : "update";
	});
	const locales = createMemo(() => contentLocaleStore.get.locales);

	// ---------------------------------
	// Queries & Mutations
	const media = api.media.useGetSingle({
		queryParams: {
			location: {
				id: props.id as Accessor<number | undefined>,
			},
		},
		enabled: () => panelMode() === "update" && props.state.open,
	});
	const updatePosterMedia = props.id
		? useUpdateMedia(() => media.data?.data.poster?.id)
		: null;
	const updatePosterAlt = api.media.useUpdateSingle();
	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
	});

	// ---------------------------------
	// Memos
	const showAltInput = createMemo(() => {
		if (MediaFile.getFile() !== null) {
			const type = helpers.getMediaType(MediaFile.getMimeType());
			return type === "image";
		}
		return panelMode() === "create" ? false : media.data?.data.type === "image";
	});
	const currentMediaType = createMemo(() => {
		if (MediaFile.getFile() !== null) {
			return helpers.getMediaType(MediaFile.getMimeType());
		}
		return media.data?.data.type;
	});
	const showPosterInput = createMemo(() => {
		return currentMediaType() === "video";
	});
	const showMediaImageGenerationAction = createMemo(() => {
		if (panelMode() === "create") return true;
		return media.data?.data.type === "image";
	});
	const showDescriptionInput = createMemo(() => {
		const type = currentMediaType();
		return type === "video" || type === "audio";
	});
	const showSummaryInput = createMemo(() => {
		return currentMediaType() === "document";
	});
	const showPosterAltInput = createMemo(() => {
		return (
			showPosterInput() &&
			PosterFile.getRemovedCurrent() !== true &&
			(PosterFile.getFile() !== null || media.data?.data.poster != null)
		);
	});
	const posterPreview = createMemo(() => {
		const file = PosterFile.getFile();
		if (file) {
			const url = URL.createObjectURL(file);
			return {
				name: file.name,
				url,
				focalPointUrl: url,
				isNew: true,
			};
		}

		if (
			PosterFile.getRemovedCurrent() !== true &&
			media.data?.data.poster != null
		) {
			return {
				name: T()("media.poster.label"),
				url: `${media.data?.data.poster?.url}?preset=thumbnail-medium&format=webp`,
				focalPointUrl: `${media.data?.data.poster?.url}?preset=thumbnail-large&format=webp`,
				cropUrl: media.data.data.poster.url,
				mimeType: media.data.data.poster.meta.mimeType,
				origin: media.data.data.poster.origin,
				isNew: false,
			};
		}

		return null;
	});
	const mediaAltImage = createMemo(() => {
		if (!showAltInput()) return null;

		const file = MediaFile.getFile();
		if (file) return { file, filename: file.name };

		if (media.data?.data.type === "image" && media.data.data.url) {
			return {
				url: media.data.data.url,
				filename: media.data.data.fileName ?? media.data.data.key,
			};
		}

		return null;
	});
	const posterAltImage = createMemo(() => {
		if (!showPosterAltInput()) return null;

		const file = PosterFile.getFile();
		if (file) return { file, filename: file.name };

		const poster = media.data?.data.poster;
		if (poster?.url) {
			return {
				url: poster.url,
				filename: poster.fileName ?? poster.key,
			};
		}

		return null;
	});
	const posterImageGenerationSource = createMemo(() => {
		const file = PosterFile.getFile();
		if (file && helpers.getMediaType(file.type) === "image") {
			return {
				file,
				filename: file.name,
			};
		}

		const poster = media.data?.data.poster;
		if (
			PosterFile.getRemovedCurrent() !== true &&
			poster?.type === "image" &&
			poster.url
		) {
			return {
				url: poster.url,
				filename: poster.fileName ?? poster.key,
			};
		}

		return null;
	});
	const posterCropSource = createMemo<ImageCropSource | null>(() => {
		const file = PosterFile.getFile();
		if (file && helpers.getMediaType(file.type) === "image") {
			if (!isSupportedCropMimeType(file.type)) return null;

			return {
				file,
				name: file.name,
				mimeType: file.type,
				provenance: PosterFile.getFileProvenance() ?? { origin: "human" },
			};
		}

		const poster = media.data?.data.poster;
		if (
			PosterFile.getRemovedCurrent() !== true &&
			poster?.type === "image" &&
			poster.url &&
			isSupportedCropMimeType(poster.meta.mimeType)
		) {
			return {
				url: poster.url,
				name: poster.fileName ?? poster.key,
				mimeType: poster.meta.mimeType,
				provenance: {
					origin: poster.origin,
				},
			};
		}

		return null;
	});
	const posterMeta = createMemo(() => {
		const file = PosterFile.getFile();
		if (file) {
			return {
				fileSize: file.size,
				mimeType: file.type,
				extension: file.name.split(".").pop() || "",
				width: null,
				height: null,
			};
		}

		if (
			PosterFile.getRemovedCurrent() !== true &&
			media.data?.data.poster != null
		) {
			return {
				fileSize: media.data.data.poster.meta.fileSize,
				mimeType: media.data.data.poster.meta.mimeType,
				extension: media.data.data.poster.meta.extension,
				width: media.data.data.poster.meta.width,
				height: media.data.data.poster.meta.height,
			};
		}

		return null;
	});
	const posterMetaPills = createMemo(() => {
		const meta = posterMeta();
		if (!meta) return [];

		const pills = [
			helpers.bytesToSize(meta.fileSize),
			meta.width && meta.height ? `${meta.width} x ${meta.height}` : undefined,
			meta.mimeType,
			meta.extension ? meta.extension.toUpperCase() : undefined,
		];

		return pills.filter(Boolean) as string[];
	});
	const posterEmptyDescription = createMemo(() => {
		if (PosterFile.getRemovedCurrent() && media.data?.data.poster) {
			return T()("media.poster.pending.removed");
		}
		return T()("media.poster.empty.description");
	});
	const posterSnapshotSource = createMemo(() => {
		if (!showPosterInput() || posterPreview() !== null) return null;

		const file = MediaFile.getFile();
		if (file && helpers.getMediaType(file.type) === "video") {
			return file;
		}

		if (media.data?.data.type === "video" && media.data.data.url) {
			return {
				url: media.data.data.url,
				fileName: media.data.data.fileName ?? media.data.data.key,
			};
		}

		return null;
	});
	const fileSizeMeta = createMemo(() => {
		const values = [
			helpers.bytesToSize(media.data?.data.meta.fileSize ?? 0),
			posterMeta()?.fileSize !== undefined
				? helpers.bytesToSize(posterMeta()?.fileSize)
				: undefined,
		].filter(Boolean);
		return values.join(", ");
	});
	const extensionMeta = createMemo(() => {
		const values = [
			media.data?.data.meta.extension,
			posterMeta()?.extension,
		].filter(Boolean);
		return values.join(", ");
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

	const resolvedDefaultFolderId = createMemo(() => {
		const d = props.state.parentFolderId();
		if (d === undefined || d === "") return undefined;
		return typeof d === "string" ? Number.parseInt(d, 10) : d;
	});

	const coreMutateIsLoading = createMemo(() => {
		return panelMode() === "create"
			? createMedia.isLoading() || createPosterMedia.isLoading()
			: updateMedia?.isLoading() ||
					createMedia.isLoading() ||
					createPosterMedia.isLoading() ||
					updatePosterMedia?.isLoading() ||
					updatePosterAlt.action.isPending ||
					false;
	});
	const mutateErrors = createMemo(() => {
		return panelMode() === "create"
			? createMedia.errors() || createPosterMedia.errors() || uploadErrors()
			: updateMedia?.errors() ||
					createMedia.errors() ||
					createPosterMedia.errors() ||
					updatePosterMedia?.errors() ||
					uploadErrors() ||
					updatePosterAlt.errors();
	});

	const hasTranslationErrors = createMemo(() => {
		const titleErrors = getBodyError("title", mutateErrors())?.children;
		const altErrors = getBodyError("alt", mutateErrors())?.children;
		const descriptionErrors = getBodyError(
			"description",
			mutateErrors(),
		)?.children;
		const summaryErrors = getBodyError("summary", mutateErrors())?.children;
		return (
			(titleErrors && titleErrors.length > 0) ||
			(altErrors && altErrors.length > 0) ||
			(descriptionErrors && descriptionErrors.length > 0) ||
			(summaryErrors && summaryErrors.length > 0)
		);
	});
	const hasDetailsErrors = createMemo(() => {
		return (
			Boolean(getBodyError("translations", mutateErrors())) ||
			Boolean(getBodyError("title", mutateErrors())) ||
			Boolean(getBodyError("alt", mutateErrors())) ||
			Boolean(getBodyError("description", mutateErrors())) ||
			Boolean(getBodyError("summary", mutateErrors())) ||
			Boolean(getBodyError("folderId", mutateErrors())) ||
			Boolean(getBodyError("featured", mutateErrors()))
		);
	});
	const hasPosterErrors = createMemo(() => {
		return Boolean(
			getBodyError("posterId", mutateErrors()) ||
				getBodyError("file", mutateErrors()) ||
				getBodyError("alt", updatePosterAlt.errors()),
		);
	});
	const visibleTabs = createMemo<Array<"details" | "poster" | "meta">>(() => {
		const tabs: Array<"details" | "poster" | "meta"> = ["details"];
		if (showPosterInput()) tabs.push("poster");
		if (props.id !== undefined) tabs.push("meta");
		return tabs;
	});

	const targetAction = createMemo(() => {
		return panelMode() === "create" ? createMedia : updateMedia;
	});
	const targetUploadProgress = createMemo(() => {
		return targetAction()?.uploadProgress() ?? 0;
	});
	const posterUploadProgress = createMemo(() => {
		if (updatePosterMedia?.isLoading()) {
			return updatePosterMedia.uploadProgress();
		}
		return createPosterMedia.uploadProgress();
	});
	const posterUploadActive = createMemo(() => {
		return (
			(createPosterMedia.isLoading() || updatePosterMedia?.isLoading()) &&
			posterUploadProgress() > 0
		);
	});
	const targetState = createMemo(() => {
		return targetAction()?.state;
	});

	const MediaAltGenerationButton = mediaAltGeneration.createActionButton({
		image: mediaAltImage,
		media: () => ({
			id: media.data?.data.id,
			name: targetState()?.title(),
			alt: targetState()?.alt(),
		}),
		locales,
		setAlt: (value) => {
			targetAction()?.setAlt(value);
		},
		disabled: coreMutateIsLoading,
	});

	const PosterAltGenerationButton = mediaAltGeneration.createActionButton({
		image: posterAltImage,
		media: () => ({
			id: media.data?.data.poster?.id,
			name: media.data?.data.poster?.title,
			alt: posterAlt(),
		}),
		locales,
		setAlt: setPosterAlt,
		disabled: coreMutateIsLoading,
	});
	const posterImageGenerationTarget: MediaImageGenerationTarget = {
		image: posterImageGenerationSource,
		setFile: async (file, meta) => {
			await PosterFile.setGeneratedFile(file, meta);
			setUploadErrors(undefined);
		},
		disabled: coreMutateIsLoading,
	};

	const mutateIsLoading = createMemo(() => {
		return (
			coreMutateIsLoading() ||
			mediaAltGeneration.isLoading() ||
			mediaImageGeneration.isLoading()
		);
	});

	const updateData = createMemo(() => {
		const state = targetState();
		const { changed, data } = helpers.updateData(
			{
				key: undefined,
				title: media.data?.data.title || [],
				alt: media.data?.data.alt || [],
				description: media.data?.data.description || [],
				summary: media.data?.data.summary || [],
				folderId: media.data?.data.folderId ?? null,
				public: media.data?.data.public ?? true,
				posterId: showPosterInput()
					? (media.data?.data.poster?.id ?? null)
					: undefined,
				focalPoint:
					media.data?.data.type === "image"
						? (media.data.data.meta.focalPoint ?? null)
						: undefined,
				posterAlt: showPosterAltInput()
					? (media.data?.data.poster?.alt ?? [])
					: undefined,
				posterFocalPoint: showPosterAltInput()
					? (media.data?.data.poster?.meta.focalPoint ?? null)
					: undefined,
			},
			{
				key: state?.key(),
				title: state?.title(),
				alt: state?.alt(),
				description: showDescriptionInput() ? state?.description() : undefined,
				summary: showSummaryInput() ? state?.summary() : undefined,
				folderId: state?.folderId(),
				public: state?.public(),
				posterId: showPosterInput()
					? PosterFile.getRemovedCurrent()
						? null
						: state?.posterId()
					: undefined,
				focalPoint:
					currentMediaType() === "image"
						? MediaFile.getFocalPoint()
						: undefined,
				posterAlt: showPosterAltInput() ? posterAlt() : undefined,
				posterFocalPoint: showPosterAltInput()
					? PosterFile.getFocalPoint()
					: undefined,
			},
		);

		let resChanged = changed;
		if (MediaFile.getFile()) resChanged = true;
		if (PosterFile.getFile()) resChanged = true;

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
				title: T()("panels.media.create.title"),
				submit: T()("common.upload"),
			};
		}
		return {
			title: T()("panels.media.update.title"),
			submit: T()("common.update"),
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
	function inputError(index: number) {
		const errors = getBodyError("translations", mutateErrors())?.children;
		if (errors) return errors[index];
		return undefined;
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
	function posterAltError(index: number) {
		const errors = getBodyError("alt", updatePosterAlt.errors())?.children;
		if (errors) return errors[index];
		return undefined;
	}
	function descriptionError(index: number) {
		const errors = getBodyError("description", mutateErrors())?.children;
		if (errors) return errors[index];
		return undefined;
	}
	function summaryError(index: number) {
		const errors = getBodyError("summary", mutateErrors())?.children;
		if (errors) return errors[index];
		return undefined;
	}
	function tabLabel(tab: "details" | "poster" | "meta") {
		if (tab === "details") return T()("common.details");
		if (tab === "poster") return T()("media.poster.label");
		return T()("common.meta");
	}
	function tabHasError(tab: "details" | "poster" | "meta") {
		if (tab === "details") return hasDetailsErrors();
		if (tab === "poster") return hasPosterErrors();
		return false;
	}
	function openPosterFileBrowser() {
		posterInputRef?.click();
	}
	function previewPosterFile() {
		const preview = posterPreview();
		if (!preview) return;
		const url = preview.url.includes("?")
			? preview.url.split("?")[0]
			: preview.url;
		window.open(url, "_blank");
	}
	function openPosterCropEditor() {
		const source = posterCropSource();
		if (!source) return;
		setActivePosterCropSource(source);
		setPosterCropEditorOpen(true);
	}
	async function applyPosterCrop(
		file: File,
		provenance: ImageCropProvenance,
	): Promise<undefined> {
		await PosterFile.setCroppedFile(file, provenance);
		setUploadErrors(undefined);
		return undefined;
	}
	function clearPosterFile() {
		PosterFile.setGetFile(null);
		PosterFile.setGetRemovedCurrent(true);
		PosterFile.setFocalPoint(null);
	}
	function undoPosterFile() {
		PosterFile.setGetFile(null);
		PosterFile.setGetRemovedCurrent(false);
		PosterFile.setFocalPoint(media.data?.data.poster?.meta.focalPoint ?? null);
		setPosterAlt(
			media.data?.data.poster?.alt ?? recordToTranslations(locales()),
		);
	}
	async function createPosterSnapshot() {
		const source = posterSnapshotSource();
		if (!source) return;

		const captureId = ++posterCaptureId;
		setPosterSnapshotLoading(true);

		try {
			const posterFile = await captureVideoPosterFrame(source);
			if (captureId !== posterCaptureId || posterFile === null) return;
			if (posterSnapshotSource() === null) return;

			PosterFile.setGetFile(posterFile);
			PosterFile.setGetRemovedCurrent(false);
			PosterFile.setFocalPoint(null);
			autoCapturedPoster = {
				posterFile,
			};
			setUploadErrors(undefined);
		} catch (_error) {
			return;
		} finally {
			if (captureId === posterCaptureId) setPosterSnapshotLoading(false);
		}
	}
	async function createPoster() {
		const file = PosterFile.getFile();
		if (!file) return undefined;

		if (!file.type.startsWith("image/")) {
			setFileError(T()("media.poster.image.only"));
			return null;
		}

		const imageMeta = await PosterFile.getImageMeta();
		const existingPoster = media.data?.data.poster;
		if (existingPoster && updatePosterMedia) {
			updatePosterMedia.setTitle(existingPoster.title ?? []);
			updatePosterMedia.setAlt(posterAlt());
			updatePosterMedia.setDescription(existingPoster.description ?? []);
			updatePosterMedia.setSummary(existingPoster.summary ?? []);
			updatePosterMedia.setFolderId(null);
			updatePosterMedia.setPublic(targetState()?.public() ?? true);
			updatePosterMedia.setFocalPoint(PosterFile.getFocalPoint() ?? undefined);

			const success = await updatePosterMedia.updateMedia(
				file,
				imageMeta,
				PosterFile.getFileProvenance(),
			);
			return success ? existingPoster.id : null;
		}

		const poster = await createPosterMedia.createMedia(file, imageMeta, {
			title: [],
			alt: posterAlt(),
			folderId: null,
			public: targetState()?.public() ?? true,
			isHidden: true,
			focalPoint: PosterFile.getFocalPoint() ?? undefined,
			origin: PosterFile.getFileProvenance()?.origin,
			aiGenerationRequestId:
				PosterFile.getFileProvenance()?.aiGenerationRequestId,
		});

		return poster?.id ?? null;
	}

	// ---------------------------------
	// Handlers
	const updateExistingPosterAlt = async () => {
		const poster = media.data?.data.poster;
		if (!poster || PosterFile.getFile() || PosterFile.getRemovedCurrent()) {
			return true;
		}

		const { changed } = helpers.updateData(
			{ alt: poster.alt, focalPoint: poster.meta.focalPoint ?? null },
			{ alt: posterAlt(), focalPoint: PosterFile.getFocalPoint() },
		);
		if (!changed) return true;

		await updatePosterAlt.action.mutateAsync({
			id: poster.id,
			body: {
				alt: posterAlt(),
				focalPoint: PosterFile.getFocalPoint(),
			},
		});

		return true;
	};

	// ---------------------------------
	// Handlers
	const onSubmit = async () => {
		const imageMeta = await MediaFile.getImageMeta();

		if (panelMode() === "create") {
			const posterId = showPosterInput() ? await createPoster() : undefined;
			if (posterId === null) return;

			const media = await createMedia.createMedia(
				MediaFile.getFile(),
				imageMeta,
				{
					posterId,
					focalPoint:
						currentMediaType() === "image"
							? (MediaFile.getFocalPoint() ?? undefined)
							: undefined,
					origin: MediaFile.getFileProvenance()?.origin,
					aiGenerationRequestId:
						MediaFile.getFileProvenance()?.aiGenerationRequestId,
				},
			);

			if (media === null) return;

			props.callbacks?.onSuccess?.(media);
			props.state.setOpen(false);
		} else {
			const posterId = await createPoster();
			if (posterId === null) return;
			if (posterId !== undefined) {
				updateMedia?.setPosterId(posterId);
			} else if (PosterFile.getRemovedCurrent()) {
				updateMedia?.setPosterId(null);
			}

			updateMedia?.setFocalPoint(
				currentMediaType() === "image" ? MediaFile.getFocalPoint() : undefined,
			);
			const success = await updateMedia?.updateMedia(
				MediaFile.getFile(),
				imageMeta,
				MediaFile.getFileProvenance(),
			);

			if (!success) return;

			const posterAltSuccess = await updateExistingPosterAlt();
			if (!posterAltSuccess) return;

			props.state.setOpen(false);
		}
	};

	// ---------------------------------
	// Effects
	createEffect(() => {
		const file = MediaFile.getFile();
		const panelOpen = props.state.open;
		const captureId = ++posterCaptureId;

		if (!panelOpen || !file || helpers.getMediaType(file.type) !== "video") {
			untrack(() => {
				if (
					autoCapturedPoster &&
					PosterFile.getFile() === autoCapturedPoster.posterFile
				) {
					PosterFile.setGetFile(null);
					PosterFile.setFocalPoint(null);
				}
				autoCapturedPoster = undefined;
			});
			return;
		}
		if (untrack(() => posterPreview() !== null)) return;

		const shouldCapture = untrack(() => {
			const currentPosterFile = PosterFile.getFile();
			return (
				currentPosterFile === null ||
				currentPosterFile === autoCapturedPoster?.posterFile
			);
		});
		if (!shouldCapture) return;

		void captureVideoPosterFrame(file)
			.then((posterFile) => {
				if (
					captureId !== posterCaptureId ||
					posterFile === null ||
					MediaFile.getFile() !== file
				) {
					return;
				}

				untrack(() => {
					const currentPosterFile = PosterFile.getFile();
					if (
						currentPosterFile !== null &&
						currentPosterFile !== autoCapturedPoster?.posterFile
					) {
						return;
					}

					PosterFile.setGetFile(posterFile);
					PosterFile.setGetRemovedCurrent(false);
					PosterFile.setFocalPoint(null);
					autoCapturedPoster = {
						posterFile,
					};
					setUploadErrors(undefined);
				});
			})
			.catch(() => {
				if (captureId !== posterCaptureId) return;
			});
	});

	createEffect(
		on(
			[
				() => props.state.open,
				panelMode,
				() => media.isSuccess,
				() => media.data?.data.id,
			],
			([open, mode, isSuccess]) => {
				if (!open || !isSuccess || mode !== "update") return;
				const mediaData = media.data?.data;
				if (!mediaData) return;

				updateMedia?.setTitle(mediaData.title || []);
				updateMedia?.setAlt(mediaData.alt || []);
				updateMedia?.setDescription(mediaData.description || []);
				updateMedia?.setSummary(mediaData.summary || []);
				updateMedia?.setFolderId(mediaData.folderId ?? null);
				updateMedia?.setPublic(mediaData.public ?? true);
				updateMedia?.setPosterId(mediaData.poster?.id ?? null);
				setPosterAlt(mediaData.poster?.alt ?? recordToTranslations(locales()));
				setPosterCropEditorOpen(false);
				setActivePosterCropSource(null);
				MediaFile.reset();
				MediaFile.setCurrentFile({
					name: mediaData.key,
					url: mediaData.url
						? mediaData.type === "image"
							? `${mediaData.url}?preset=thumbnail-medium&format=webp`
							: mediaData.url
						: undefined,
					focalPointUrl: mediaData.url
						? `${mediaData.url}?preset=thumbnail-large&format=webp`
						: undefined,
					cropUrl: mediaData.url,
					type: mediaData.type || undefined,
					mimeType: mediaData.meta.mimeType,
					origin: mediaData.origin,
					width: mediaData.meta.width,
					height: mediaData.meta.height,
					focalPoint: mediaData.meta.focalPoint ?? null,
				});
				PosterFile.reset();
				if (mediaData.poster) {
					PosterFile.setCurrentFile({
						name: T()("media.poster.label"),
						url: `${mediaData.poster.url}?preset=thumbnail-medium&format=webp`,
						focalPointUrl: `${mediaData.poster.url}?preset=thumbnail-large&format=webp`,
						cropUrl: mediaData.poster.url,
						type: "image",
						mimeType: mediaData.poster.meta.mimeType,
						origin: mediaData.poster.origin,
						width: mediaData.poster.meta.width,
						height: mediaData.poster.meta.height,
						focalPoint: mediaData.poster.meta.focalPoint ?? null,
					});
				}
			},
		),
	);

	createEffect(() => {
		if (panelMode() === "create") {
			const newFolderId = resolvedDefaultFolderId();
			if (createMedia.state.folderId() !== newFolderId) {
				createMedia.setFolderId(newFolderId);
			}
		}
	});

	createEffect(() => {
		const initialFile = props.initialFile?.();
		if (!props.state.open || panelMode() !== "create" || !initialFile) return;

		untrack(() => {
			if (MediaFile.getFile() === initialFile) return;
			MediaFile.setGetFile(initialFile);
			MediaFile.setGetRemovedCurrent(false);
			MediaFile.setFocalPoint(null);
			setUploadErrors(undefined);
		});
	});

	createEffect(() => {
		if (!visibleTabs().includes(activeTab())) {
			setActiveTab("details");
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
					createPosterMedia.reset();
					updateMedia?.reset();
					updatePosterMedia?.reset();
					updatePosterAlt.reset();
					MediaFile.reset();
					PosterFile.reset();
					posterCaptureId += 1;
					autoCapturedPoster = undefined;
					setPosterSnapshotLoading(false);
					setPosterAlt([]);
					setPosterFocalEditorOpen(false);
					setPosterCropEditorOpen(false);
					setActivePosterCropSource(null);
					setActiveTab("details");
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
					<PanelTabs
						items={visibleTabs().map((tab) => ({
							value: tab,
							label: tabLabel(tab),
							hasError: tabHasError(tab),
						}))}
						active={activeTab()}
						onChange={setActiveTab}
					/>
					<Show when={activeTab() === "details"}>
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
							copy={{ label: T()("common.folder") }}
							required={false}
							errors={getBodyError("folderId", mutateErrors())}
							noMargin={false}
							noClear={true}
							hideOptionalText={true}
						/>
						<Checkbox
							id="public"
							value={targetState()?.public() ?? true}
							onChange={(val) => {
								targetAction()?.setPublic(val);
							}}
							name="public"
							copy={{
								label: T()("common.publicly.available"),
								tooltip: T()("media.visibility.public.description"),
							}}
							errors={getBodyError("featured", mutateErrors())}
						/>
						<For each={locales()}>
							{(locale, index) => (
								<Show when={locale.code === lang?.contentLocale()}>
									<Input
										id={`name-${locale.code}`}
										value={
											getTranslation(targetState()?.title(), locale.code) || ""
										}
										onChange={(val) => {
											updateTranslation(targetAction()?.setTitle, {
												localeCode: locale.code,
												value: val,
											});
										}}
										name={`name-${locale.code}`}
										type="text"
										copy={{
											label: T()("common.name"),
										}}
										errors={getErrorObject(inputError(index())?.name)}
										autoComplete="off"
										hideOptionalText={true}
									/>
									<Show when={showAltInput()}>
										<Textarea
											id={`alt-${locale.code}`}
											value={
												getTranslation(targetState()?.alt(), locale.code) || ""
											}
											onChange={(val) => {
												updateTranslation(targetAction()?.setAlt, {
													localeCode: locale.code,
													value: val,
												});
											}}
											name={`alt-${locale.code}`}
											copy={{
												label: T()("common.alt"),
											}}
											errors={getErrorObject(inputError(index())?.alt)}
											rows={3}
											hideOptionalText={true}
											labelRightSlot={<MediaAltGenerationButton />}
										/>
									</Show>
									<Show when={showDescriptionInput()}>
										<Textarea
											id={`description-${locale.code}`}
											value={
												getTranslation(
													targetState()?.description(),
													locale.code,
												) || ""
											}
											onChange={(val) => {
												updateTranslation(targetAction()?.setDescription, {
													localeCode: locale.code,
													value: val,
												});
											}}
											name={`description-${locale.code}`}
											copy={{
												label: T()("common.description"),
											}}
											errors={getErrorObject(descriptionError(index()))}
											hideOptionalText={true}
										/>
									</Show>
									<Show when={showSummaryInput()}>
										<Textarea
											id={`summary-${locale.code}`}
											value={
												getTranslation(targetState()?.summary(), locale.code) ||
												""
											}
											onChange={(val) => {
												updateTranslation(targetAction()?.setSummary, {
													localeCode: locale.code,
													value: val,
												});
											}}
											name={`summary-${locale.code}`}
											copy={{
												label: T()("common.summary"),
											}}
											errors={getErrorObject(summaryError(index()))}
											hideOptionalText={true}
										/>
									</Show>
								</Show>
							)}
						</For>
					</Show>
					<Show when={activeTab() === "poster" && showPosterInput()}>
						<input
							ref={posterInputRef}
							type="file"
							name="poster"
							id="poster"
							accept="image/*"
							class="hidden"
							onChange={(e) => {
								if (e.currentTarget.files?.length) {
									PosterFile.setGetFile(e.currentTarget.files[0]);
									PosterFile.setGetRemovedCurrent(false);
									PosterFile.setFocalPoint(null);
									e.currentTarget.value = "";
								}
							}}
						/>
						<div class="w-full rounded-md border border-border bg-input-base mb-3 overflow-hidden relative">
							<div class="grid grid-cols-[112px_1fr_auto] items-center gap-3 p-3">
								<div class="h-20 rounded-sm border border-border rectangle-background overflow-hidden flex items-center justify-center bg-background-base">
									<Show
										when={posterPreview()}
										fallback={<FaSolidImage class="w-6 h-6 text-icon-fade" />}
									>
										{(preview) => (
											<img
												src={preview().url}
												alt={preview().name}
												class="w-full h-full object-contain z-10"
											/>
										)}
									</Show>
								</div>
								<div class="min-w-0">
									<p class="text-sm font-medium text-subtitle truncate">
										{posterPreview()?.name ?? T()("media.poster.none.selected")}
									</p>
									<Show
										when={posterMetaPills().length > 0}
										fallback={
											<p class="text-xs text-unfocused mt-1">
												{posterEmptyDescription()}
											</p>
										}
									>
										<div class="flex items-center gap-1.5 flex-wrap mt-2">
											<For each={posterMetaPills()}>
												{(pill) => (
													<Pill theme="outline" class="text-[10px]">
														{pill}
													</Pill>
												)}
											</For>
											<Show when={posterPreview()?.isNew}>
												<Pill theme="primary-opaque" class="text-[10px]">
													{T()("media.poster.pending.upload")}
												</Pill>
											</Show>
										</div>
									</Show>
								</div>
								<div class="flex items-center justify-center gap-1 self-center">
									<Show when={posterPreview()}>
										<Button
											type="button"
											theme="secondary-subtle"
											size="icon-subtle"
											onClick={previewPosterFile}
											title={T()("common.preview")}
											aria-label={T()("common.preview")}
										>
											<FaSolidMagnifyingGlass size={14} />
										</Button>
										<Button
											type="button"
											theme="secondary-subtle"
											size="icon-subtle"
											onClick={() => setPosterFocalEditorOpen(true)}
											title={T()("media.focal.point.edit")}
											aria-label={T()("media.focal.point.edit")}
										>
											<FaSolidBullseye size={14} />
										</Button>
										<Show when={posterCropSource()}>
											<Button
												type="button"
												theme="secondary-subtle"
												size="icon-subtle"
												onClick={openPosterCropEditor}
												title={T()("media.crop.action")}
												aria-label={T()("media.crop.action")}
											>
												<FaSolidCrop size={14} />
											</Button>
										</Show>
									</Show>
									<Show when={posterSnapshotSource()}>
										<Button
											type="button"
											theme="secondary-subtle"
											size="icon-subtle"
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												void createPosterSnapshot();
											}}
											title={T()("media.poster.snapshot.create")}
											aria-label={T()("media.poster.snapshot.create")}
											loading={posterSnapshotLoading()}
											disabled={posterSnapshotLoading() || mutateIsLoading()}
										>
											<FaSolidImage size={14} />
										</Button>
									</Show>
									<Button
										type="button"
										theme="secondary-subtle"
										size="icon-subtle"
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											mediaImageGeneration.open(
												posterImageGenerationTarget,
												posterImageGenerationTargetId,
											);
										}}
										title={mediaImageGeneration.getTooltip(
											posterImageGenerationTarget,
										)}
										aria-label={T()("ai.media.image.generate.action")}
										aria-disabled={
											mediaImageGeneration.isDisabled(
												posterImageGenerationTarget,
											)
												? "true"
												: undefined
										}
										aria-busy={
											mediaImageGeneration.isTargetLoading(
												posterImageGenerationTargetId,
											)
												? "true"
												: undefined
										}
										loading={mediaImageGeneration.isTargetLoading(
											posterImageGenerationTargetId,
										)}
										disabled={
											mediaImageGeneration.isDisabled(
												posterImageGenerationTarget,
											) && !mediaImageGeneration.accessState().disabled
										}
										classes={
											mediaImageGeneration.accessState().disabled
												? "opacity-80 cursor-not-allowed"
												: undefined
										}
									>
										<FaSolidMagicWandSparkles size={14} />
									</Button>
									<Button
										type="button"
										theme="secondary-subtle"
										size="icon-subtle"
										onClick={openPosterFileBrowser}
										title={T()("common.upload")}
										aria-label={T()("common.upload")}
									>
										<FaSolidArrowUpFromBracket size={14} />
									</Button>
									<Show when={posterPreview()}>
										<Button
											type="button"
											theme="danger-subtle"
											size="icon-subtle"
											onClick={clearPosterFile}
											title={T()("common.remove")}
											aria-label={T()("common.remove")}
										>
											<FaSolidXmark size={14} />
										</Button>
									</Show>
									<Show
										when={
											PosterFile.getRemovedCurrent() && media.data?.data.poster
										}
									>
										<Button
											type="button"
											theme="secondary-subtle"
											size="icon-subtle"
											onClick={undoPosterFile}
											title={T()("media.file.back.to.current")}
											aria-label={T()("media.file.back.to.current")}
										>
											<FaSolidArrowRotateLeft size={14} />
										</Button>
									</Show>
								</div>
							</div>
							<Show when={posterPreview()}>
								{(preview) => (
									<FocalPointEditor
										state={{
											open: posterFocalEditorOpen(),
											setOpen: setPosterFocalEditorOpen,
										}}
										src={preview().focalPointUrl ?? preview().url}
										alt={preview().name}
										dimensions={{
											width: posterMeta()?.width,
											height: posterMeta()?.height,
										}}
										value={PosterFile.getFocalPoint()}
										onSave={PosterFile.setFocalPoint}
									/>
								)}
							</Show>
							<ImageCropEditor
								state={{
									open: posterCropEditorOpen(),
									setOpen: setPosterCropEditorOpen,
								}}
								source={activePosterCropSource()}
								onApply={applyPosterCrop}
							/>
							<Show when={posterUploadActive()}>
								<div class="absolute inset-x-0 bottom-0 z-20">
									<ProgressBar
										progress={posterUploadProgress()}
										type="target"
										variant="edge"
									/>
								</div>
							</Show>
						</div>
						<Show when={showPosterAltInput()}>
							<For each={locales()}>
								{(locale, index) => (
									<Show when={locale.code === lang?.contentLocale()}>
										<Textarea
											id={`poster-alt-${locale.code}`}
											value={getTranslation(posterAlt(), locale.code) || ""}
											onChange={(val) => {
												updateTranslation(setPosterAlt, {
													localeCode: locale.code,
													value: val,
												});
											}}
											name={`poster-alt-${locale.code}`}
											copy={{
												label: T()("media.poster.alt"),
											}}
											errors={getErrorObject(posterAltError(index()))}
											rows={3}
											hideOptionalText={true}
											labelRightSlot={<PosterAltGenerationButton />}
										/>
									</Show>
								)}
							</For>
						</Show>
					</Show>
					<Show when={activeTab() === "meta" && props.id !== undefined}>
						<DetailsList
							type="text"
							items={[
								{
									label: T()("common.file.size"),
									value: fileSizeMeta(),
								},
								{
									label: T()("common.dimensions"),
									value: `${media.data?.data.meta.width} x ${media.data?.data.meta.height}`,
									show: media.data?.data.type === "image",
								},
								{
									label: T()("common.extension"),
									value: extensionMeta(),
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
				</>
			)}
		</Panel>
	);
};

export default CreateUpdateMediaPanel;
