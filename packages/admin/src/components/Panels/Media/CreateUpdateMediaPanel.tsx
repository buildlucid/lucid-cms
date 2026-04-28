import type { ErrorResponse, Media } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowRotateLeft,
	FaSolidArrowUpFromBracket,
	FaSolidBullseye,
	FaSolidImage,
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
	Show,
	untrack,
} from "solid-js";
import { Checkbox, Input, Select, Textarea } from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import FocalPointEditor from "@/components/Modals/Media/FocalPointEditor";
import Button from "@/components/Partials/Button";
import DetailsList from "@/components/Partials/DetailsList";
import Pill from "@/components/Partials/Pill";
import ProgressBar from "@/components/Partials/ProgressBar";
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
	const [uploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [posterAlt, setPosterAlt] = createSignal<Media["alt"]>([]);
	const [posterFocalEditorOpen, setPosterFocalEditorOpen] = createSignal(false);
	const [activeTab, setActiveTab] = createSignal<"details" | "poster" | "meta">(
		"details",
	);
	const createMedia = useCreateMedia();
	const updateMedia = props.id ? useUpdateMedia(props.id) : null;

	const MediaFile = useSingleFileUpload({
		id: "file",
		disableRemoveCurrent: true,
		name: "file",
		required: true,
		errors: () => mutateErrors(),
		progress: () => ({
			active:
				Boolean(targetAction()?.isLoading()) && targetUploadProgress() > 0,
			value: targetUploadProgress(),
		}),
		noMargin: false,
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
	const showPosterInput = createMemo(() => {
		return panelMode() === "update" && media.data?.data.type === "video";
	});
	const currentMediaType = createMemo(() => {
		if (MediaFile.getFile() !== null) {
			return helpers.getMediaType(MediaFile.getMimeType());
		}
		return media.data?.data.type;
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
				name: T()("poster"),
				url: `${media.data?.data.poster?.url}?preset=thumbnail&format=webp`,
				focalPointUrl: media.data?.data.poster?.url,
				isNew: false,
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
			return T()("poster_removed_pending");
		}
		return T()("poster_empty_description");
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
			: updateMedia?.isLoading() ||
					createMedia.isLoading() ||
					updatePosterAlt.action.isPending ||
					false;
	});
	const mutateErrors = createMemo(() => {
		return panelMode() === "create"
			? createMedia.errors() || uploadErrors()
			: updateMedia?.errors() ||
					createMedia.errors() ||
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
		return createMedia.uploadProgress();
	});
	const posterUploadActive = createMemo(() => {
		return createMedia.isLoading() && posterUploadProgress() > 0;
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
	function recordToTranslations(record?: Record<string, string>) {
		return locales().map((locale) => ({
			localeCode: locale.code,
			value: record?.[locale.code] ?? null,
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
		if (tab === "details") return T()("details");
		if (tab === "poster") return T()("poster");
		return T()("meta");
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
	function clearPosterFile() {
		PosterFile.setGetFile(null);
		PosterFile.setGetRemovedCurrent(true);
		PosterFile.setFocalPoint(null);
	}
	function undoPosterFile() {
		PosterFile.setGetFile(null);
		PosterFile.setGetRemovedCurrent(false);
		PosterFile.setFocalPoint(media.data?.data.poster?.meta.focalPoint ?? null);
		setPosterAlt(media.data?.data.poster?.alt ?? recordToTranslations());
	}
	async function createPoster() {
		const file = PosterFile.getFile();
		if (!file) return undefined;

		if (!file.type.startsWith("image/")) {
			setFileError(T()("poster_image_only"));
			return null;
		}

		const imageMeta = await PosterFile.getImageMeta();
		const poster = await createMedia.createMedia(file, imageMeta, {
			title: [],
			alt: posterAlt(),
			folderId: null,
			public: targetState()?.public() ?? true,
			isHidden: true,
			focalPoint: PosterFile.getFocalPoint() ?? undefined,
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
			const media = await createMedia.createMedia(
				MediaFile.getFile(),
				imageMeta,
				{
					focalPoint:
						currentMediaType() === "image"
							? (MediaFile.getFocalPoint() ?? undefined)
							: undefined,
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
		if (media.isSuccess && panelMode() === "update") {
			updateMedia?.setTitle(media.data?.data.title || []);
			updateMedia?.setAlt(media.data?.data.alt || []);
			updateMedia?.setDescription(media.data?.data.description || []);
			updateMedia?.setSummary(media.data?.data.summary || []);
			updateMedia?.setFolderId(media.data?.data.folderId ?? null);
			updateMedia?.setPublic(media.data?.data.public ?? true);
			updateMedia?.setPosterId(media.data?.data.poster?.id ?? null);
			setPosterAlt(media.data?.data.poster?.alt ?? recordToTranslations());
			MediaFile.reset();
			MediaFile.setCurrentFile({
				name: media.data.data.key,
				url: media.data?.data.url
					? media.data?.data.type === "image"
						? `${media.data.data.url}?preset=thumbnail&format=webp`
						: media.data.data.url
					: undefined,
				focalPointUrl: media.data?.data.url,
				type: media.data?.data.type || undefined,
				width: media.data?.data.meta.width,
				height: media.data?.data.meta.height,
				focalPoint: media.data?.data.meta.focalPoint ?? null,
			});
			PosterFile.reset();
			if (media.data?.data.poster) {
				PosterFile.setCurrentFile({
					name: T()("poster"),
					url: `${media.data.data.poster.url}?preset=thumbnail&format=webp`,
					focalPointUrl: media.data.data.poster.url,
					type: "image",
					width: media.data.data.poster.meta.width,
					height: media.data.data.poster.meta.height,
					focalPoint: media.data.data.poster.meta.focalPoint ?? null,
				});
			}
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
					updateMedia?.reset();
					updatePosterAlt.reset();
					MediaFile.reset();
					PosterFile.reset();
					setPosterAlt([]);
					setPosterFocalEditorOpen(false);
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
					<div class="mt-6 border-b border-border mb-4">
						<div class="flex flex-row flex-wrap items-center gap-4">
							<For each={visibleTabs()}>
								{(tab) => (
									<button
										type="button"
										class={classNames(
											"border-b-2 -mb-px text-sm font-medium pb-2 focus:outline-hidden ring-inset focus-visible:ring-1 ring-primary-base transition-colors duration-200",
											{
												"border-primary-base text-title": activeTab() === tab,
												"border-transparent text-body hover:border-primary-base":
													activeTab() !== tab && !tabHasError(tab),
												"border-error-base text-error-base":
													activeTab() !== tab && tabHasError(tab),
											},
										)}
										onClick={() => setActiveTab(tab)}
									>
										{tabLabel(tab)}
									</button>
								)}
							</For>
						</div>
					</div>
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
									<Show when={showDescriptionInput()}>
										<Textarea
											id={`description-${locale.code}`}
											value={
												helpers.getTranslation(
													targetState()?.description(),
													locale.code,
												) || ""
											}
											onChange={(val) => {
												helpers.updateTranslation(
													targetAction()?.setDescription,
													{
														localeCode: locale.code,
														value: val,
													},
												);
											}}
											name={`description-${locale.code}`}
											copy={{
												label: T()("description"),
											}}
											errors={getErrorObject(descriptionError(index()))}
										/>
									</Show>
									<Show when={showSummaryInput()}>
										<Textarea
											id={`summary-${locale.code}`}
											value={
												helpers.getTranslation(
													targetState()?.summary(),
													locale.code,
												) || ""
											}
											onChange={(val) => {
												helpers.updateTranslation(targetAction()?.setSummary, {
													localeCode: locale.code,
													value: val,
												});
											}}
											name={`summary-${locale.code}`}
											copy={{
												label: T()("summary"),
											}}
											errors={getErrorObject(summaryError(index()))}
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
										{posterPreview()?.name ?? T()("no_poster_selected")}
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
													{T()("poster_pending_upload")}
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
											aria-label={T()("preview")}
										>
											<FaSolidMagnifyingGlass size={14} />
										</Button>
										<Button
											type="button"
											theme="secondary-subtle"
											size="icon-subtle"
											onClick={() => setPosterFocalEditorOpen(true)}
											aria-label={T()("edit_focal_point")}
										>
											<FaSolidBullseye size={14} />
										</Button>
									</Show>
									<Button
										type="button"
										theme="secondary-subtle"
										size="icon-subtle"
										onClick={openPosterFileBrowser}
										aria-label={T()("upload")}
									>
										<FaSolidArrowUpFromBracket size={14} />
									</Button>
									<Show when={posterPreview()}>
										<Button
											type="button"
											theme="danger-subtle"
											size="icon-subtle"
											onClick={clearPosterFile}
											aria-label={T()("remove")}
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
											aria-label={T()("back_to_current_file")}
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
										<Input
											id={`poster-alt-${locale.code}`}
											value={
												helpers.getTranslation(posterAlt(), locale.code) || ""
											}
											onChange={(val) => {
												helpers.updateTranslation(setPosterAlt, {
													localeCode: locale.code,
													value: val,
												});
											}}
											name={`poster-alt-${locale.code}`}
											type="text"
											copy={{
												label: T()("poster_alt"),
											}}
											errors={getErrorObject(posterAltError(index()))}
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
									label: T()("file_size"),
									value: fileSizeMeta(),
								},
								{
									label: T()("dimensions"),
									value: `${media.data?.data.meta.width} x ${media.data?.data.meta.height}`,
									show: media.data?.data.type === "image",
								},
								{
									label: T()("extension"),
									value: extensionMeta(),
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
