import type { ErrorResult, Media } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowRotateLeft,
	FaSolidArrowUpFromBracket,
	FaSolidFile,
	FaSolidMagicWandSparkles,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import FocalPointEditor, {
	type FocalPoint,
} from "@/components/Modals/Media/FocalPointEditor";
import ActionDropdown, {
	type ActionDropdownProps,
} from "@/components/Partials/ActionDropdown";
import ActionIcon, {
	type ActionIconName,
} from "@/components/Partials/ActionIcon";
import ProgressBar from "@/components/Partials/ProgressBar";
import Spinner from "@/components/Partials/Spinner";
import T from "@/translations";
import helpers from "@/utils/helpers";

export type SingleFileUploadImageGeneration = {
	state: {
		loading: boolean;
		disabled: boolean;
		disabledClickable: boolean;
		tooltip: string;
	};
	callbacks: {
		open: () => void;
	};
};

export type SingleFileUploadImageCrop = {
	state: {
		disabled: boolean;
		tooltip: string;
	};
	callbacks: {
		open: () => void;
	};
};

export interface SingleFileUploadProps {
	id: string;

	state: {
		value: File | null;
		setValue: (_value: File | null) => void;
		removedCurrent: boolean;
		setRemovedCurrent: (_value: boolean) => void;
	};
	currentFile?: {
		type?: Media["type"];
		url?: string;
		focalPointUrl?: string;
		cropUrl?: string;
		name?: string;
		mimeType?: string | null;
		origin?: Media["origin"];
		width?: number | null;
		height?: number | null;
		focalPoint?: FocalPoint | null;
	};
	focalPoint?: {
		value: FocalPoint | null;
		setValue: (_value: FocalPoint | null) => void;
	};
	disableRemoveCurrent?: boolean;

	name: string;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	accept?: string;
	required?: boolean;
	disabled?: boolean;
	progress?: {
		active: boolean;
		value: number;
	};
	errors?: ErrorResult;
	localised?: boolean;
	altLocaleError?: boolean;
	noMargin?: boolean;
	imageGeneration?: SingleFileUploadImageGeneration;
	imageCrop?: SingleFileUploadImageCrop;
	pendingChange?: {
		reset: () => void;
	};
}

export const SingleFileUpload: Component<SingleFileUploadProps> = (props) => {
	// ------------------------------------
	// State
	const [getDragOver, setDragOver] = createSignal<boolean>(false);

	// ------------------------------------
	// Refs
	let inputRef: HTMLInputElement | undefined;

	// ------------------------------------
	// Functions
	const clearFile = () => {
		props.state.setValue(null);
		props.state.setRemovedCurrent(true);
	};
	const undoToCurrentFile = () => {
		props.state.setValue(null);
		props.state.setRemovedCurrent(false);
	};
	const openFileBrowser = () => {
		if (inputRef) {
			inputRef.click();
		}
	};
	const downloadFile = () => {
		const url = props.currentFile?.url?.includes("?")
			? props.currentFile.url.split("?")[0]
			: props.currentFile?.url;
		window.open(url, "_blank");
	};
	const uploadFile = () => {
		clearFile();
		openFileBrowser();
	};
	const fileMatchesAccept = (file: File) => {
		if (!props.accept) return true;

		return props.accept.split(",").some((accept) => {
			const value = accept.trim().toLowerCase();
			if (!value) return false;
			if (value.startsWith(".")) {
				return file.name.toLowerCase().endsWith(value);
			}
			if (value.endsWith("/*")) {
				return file.type.toLowerCase().startsWith(value.slice(0, -1));
			}
			return file.type.toLowerCase() === value;
		});
	};
	const selectFile = (file: File) => {
		if (!fileMatchesAccept(file)) return;

		props.state.setValue(file);
		props.state.setRemovedCurrent(false);
	};

	// ------------------------------------
	// Effects
	createEffect(() => {
		if (props.state.value === null && inputRef) {
			inputRef.value = "";
		}
	});

	// ------------------------------------
	// Memos
	const showState = createMemo(() => {
		// return: new-file, no-file, current-file
		if (props.state.value !== null) {
			return "new-file";
		}

		if (props.state.removedCurrent && props.state.value === null) {
			return "no-file";
		}

		if (props.state.value === null && props.currentFile !== undefined) {
			return "current-file";
		}

		return "no-file";
	});
	const fileType = createMemo(() => {
		return helpers.getMediaType(props.state.value?.type as string);
	});

	// ------------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				theme="basic"
			/>
			<input
				ref={inputRef}
				type="file"
				name={props.name}
				id={props.id}
				accept={props.accept}
				class="hidden"
				onChange={(e) => {
					if (e.currentTarget.files?.length) {
						selectFile(e.currentTarget.files[0]);
						e.currentTarget.value = "";
					} else {
						props.state.setValue(null);
						props.state.setRemovedCurrent(true);
					}
				}}
			/>
			{/** biome-ignore lint/a11y/noStaticElementInteractions: explanation */}
			<div
				class={classNames(
					"w-full border-border border h-80 rounded-md relative overflow-hidden",
					{
						"border-dashed border-2": showState() === "no-file",
						"border-primary-base": getDragOver(),
					},
				)}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDrop={(e) => {
					e.preventDefault();
					if (e.dataTransfer?.files.length) {
						selectFile(e.dataTransfer.files[0]);
					}
					setDragOver(false);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					setDragOver(false);
				}}
			>
				<Switch>
					<Match when={showState() === "new-file"}>
						<FilePreviewScreen
							data={{
								url: URL.createObjectURL(props.state.value as File),
								type: fileType(),
								name: props.state.value?.name as string,
							}}
							progress={props.progress}
							focalPoint={props.focalPoint}
							pendingChange={props.pendingChange}
							actions={{
								clearFile,
								uploadFile,
								imageGeneration: props.imageGeneration,
								imageCrop: props.imageCrop,
							}}
						/>
					</Match>
					<Match when={showState() === "no-file"}>
						<div class="w-full h-full flex justify-center items-center flex-col p-4 md:p-6">
							<FaSolidArrowUpFromBracket class="w-7 h-7 mx-auto text-unfocused mb-5" />
							<p class="text-center text-base font-medium text-subtitle">
								{T()("media.upload.drop.or")}{" "}
								<button
									type="button"
									onClick={openFileBrowser}
									class="text-primary-base font-medium"
								>
									{T()("media.upload.drop.here")}
								</button>
							</p>
							<Show when={props.currentFile !== undefined}>
								<div class="mt-5 text-center flex flex-col items-center">
									<Show when={props.disableRemoveCurrent !== true}>
										<p class="text-sm">
											{T()("media.file.blank.removes.file.help")}
										</p>
									</Show>

									<button
										type="button"
										onClick={undoToCurrentFile}
										class="text-unfocused fill-unfocused font-medium text-sm flex items-center mt-2"
									>
										<FaSolidArrowRotateLeft class="mr-2 text-sm" />
										<Switch fallback={"keep current file"}>
											<Match when={props.disableRemoveCurrent === true}>
												{T()("media.file.back.to.current")}
											</Match>
										</Switch>
									</button>
								</div>
							</Show>
						</div>
					</Match>
					<Match when={showState() === "current-file"}>
						<FilePreviewScreen
							data={{
								url: props.currentFile?.url as string,
								focalPointUrl: props.currentFile?.focalPointUrl,
								type: props.currentFile?.type as Media["type"],
								name: props.currentFile?.name as string,
								width: props.currentFile?.width,
								height: props.currentFile?.height,
							}}
							progress={props.progress}
							focalPoint={props.focalPoint}
							pendingChange={props.pendingChange}
							actions={{
								clearFile: props.disableRemoveCurrent ? undefined : clearFile,
								downloadFile,
								uploadFile,
								imageGeneration: props.imageGeneration,
								imageCrop: props.imageCrop,
							}}
						/>
					</Match>
				</Switch>
			</div>
			<Show
				when={showState() === "no-file" ? props.imageGeneration : undefined}
			>
				{(imageGeneration) => (
					<div class="mt-2">
						<button
							type="button"
							class={classNames(
								"inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-input-base px-3 text-sm font-medium text-input-contrast transition-colors duration-200 hover:bg-secondary-hover hover:text-secondary-contrast focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-70",
								{
									"cursor-not-allowed opacity-70":
										imageGeneration().state.disabled,
								},
							)}
							disabled={
								imageGeneration().state.disabled &&
								!imageGeneration().state.disabledClickable
							}
							title={imageGeneration().state.tooltip}
							aria-label={T()("ai.media.image.generate.action")}
							aria-disabled={
								imageGeneration().state.disabled ? "true" : undefined
							}
							aria-busy={imageGeneration().state.loading ? "true" : undefined}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								imageGeneration().callbacks.open();
							}}
						>
							{imageGeneration().state.loading ? (
								<Spinner size="sm" />
							) : (
								<FaSolidMagicWandSparkles size={13} aria-hidden="true" />
							)}
							<span>{T()("ai.media.image.generate.action")}</span>
						</button>
					</div>
				)}
			</Show>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};

interface FilePreviewScreenProps {
	data: {
		url: string;
		focalPointUrl?: string;
		type: Media["type"];
		name: string;
		width?: number | null;
		height?: number | null;
	};
	progress?: {
		active: boolean;
		value: number;
	};
	focalPoint?: {
		value: FocalPoint | null;
		setValue: (_value: FocalPoint | null) => void;
	};
	pendingChange?: {
		reset: () => void;
	};
	actions: {
		clearFile?: () => void;
		downloadFile?: () => void;
		uploadFile: () => void;
		imageGeneration?: SingleFileUploadImageGeneration;
		imageCrop?: SingleFileUploadImageCrop;
	};
}

const FilePreviewScreen: Component<FilePreviewScreenProps> = (props) => {
	// ------------------------------------
	// State
	const [focalEditorOpen, setFocalEditorOpen] = createSignal(false);
	const [renderNativeMedia, setRenderNativeMedia] = createSignal(false);

	// ------------------------------------
	// Memos
	const showFocalPoint = createMemo(
		() => props.data.type === "image" && props.focalPoint !== undefined,
	);
	const quickActions = createMemo<PreviewQuickAction[]>(() => {
		return [
			{
				label: T()("media.file.pending.reset"),
				icon: "restore" as const,
				hide: props.pendingChange === undefined,
				theme: "primary" as const,
				onClick: () => props.pendingChange?.reset(),
			},
			{
				label: T()("media.crop.action"),
				icon: "crop" as const,
				hide: props.actions.imageCrop === undefined,
				disabled: props.actions.imageCrop?.state.disabled,
				onClick: () => props.actions.imageCrop?.callbacks.open(),
			},
			{
				label: T()("ai.media.image.generate.action"),
				icon: "sparkle" as const,
				hide: props.actions.imageGeneration === undefined,
				disabled:
					props.actions.imageGeneration?.state.disabled === true &&
					props.actions.imageGeneration.state.disabledClickable !== true,
				loading: props.actions.imageGeneration?.state.loading,
				onClick: () => props.actions.imageGeneration?.callbacks.open(),
			},
			{
				label: T()("media.file.replace"),
				icon: "upload" as const,
				onClick: () => props.actions.uploadFile(),
			},
		].filter((action) => action.hide !== true);
	});
	const overflowActions = createMemo<ActionDropdownProps["actions"]>(() => {
		return [
			{
				label: T()("common.preview"),
				type: "button" as const,
				icon: "eye" as const,
				hide: props.actions.downloadFile === undefined,
				onClick: () => props.actions.downloadFile?.(),
			},
			{
				label: T()("media.focal.point.label"),
				type: "button" as const,
				icon: "bullseye" as const,
				hide: !showFocalPoint(),
				onClick: () => setFocalEditorOpen(true),
			},
			{
				label: T()("common.remove"),
				type: "button" as const,
				icon: "trash" as const,
				hide: props.actions.clearFile === undefined,
				theme: "error" as const,
				onClick: () => props.actions.clearFile?.(),
			},
		];
	});

	// ------------------------------------
	// Effects
	createEffect(() => {
		props.data.type;
		props.data.url;

		setRenderNativeMedia(false);
		let secondFrame: number | undefined;
		const firstFrame = requestAnimationFrame(() => {
			secondFrame = requestAnimationFrame(() => {
				setRenderNativeMedia(true);
			});
		});

		onCleanup(() => {
			cancelAnimationFrame(firstFrame);
			if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
		});
	});

	// ------------------------------------
	// Render
	return (
		<div class="group relative w-full h-full flex justify-center items-center flex-col">
			<Show when={showFocalPoint()}>
				<FocalPointEditor
					state={{
						open: focalEditorOpen(),
						setOpen: setFocalEditorOpen,
					}}
					src={props.data.focalPointUrl ?? props.data.url}
					alt={props.data.name}
					dimensions={{
						width: props.data.width,
						height: props.data.height,
					}}
					value={props.focalPoint?.value ?? null}
					onSave={(value) => props.focalPoint?.setValue(value)}
				/>
			</Show>
			<div class="absolute right-3 top-3 z-30 flex max-w-[calc(100%-24px)] flex-wrap items-center justify-end gap-1">
				<div class="order-2">
					<ActionDropdown
						actions={overflowActions()}
						options={{
							border: true,
							placement: "bottom-end",
							raised: true,
						}}
					/>
				</div>
				<div class="order-1 flex flex-wrap items-center justify-end gap-1 opacity-100 transition-opacity duration-200 md:pointer-events-none md:opacity-0 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100">
					<For each={quickActions()}>
						{(action) => <PreviewActionButton action={action} />}
					</For>
				</div>
			</div>
			<Switch
				fallback={
					<div
						class={classNames(
							"w-full h-full relative z-10 bg-input-base flex flex-col justify-center items-center",
						)}
					>
						<FaSolidFile class="w-10 h-10 mx-auto text-unfocused mb-5" />
						<Show when={props.data.name}>
							<p class="text-center text-sm font-medium text-subtitle">
								{props.data.name}
							</p>
						</Show>
					</div>
				}
			>
				<Match when={props.data.type === "image"}>
					<div
						class={classNames(
							"w-full h-full relative z-10 p-4 rectangle-background",
						)}
					>
						<img
							src={props.data.url}
							alt={props.data.name}
							class="w-full h-full object-contain z-10 relative"
						/>
					</div>
				</Match>
				<Match when={props.data.type === "video"}>
					<div
						class={classNames(
							"w-full h-full relative z-10 bg-input-base rectangle-background",
						)}
					>
						<Show when={renderNativeMedia()}>
							{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
							<video
								src={props.data.url}
								class="w-full h-full object-contain z-10 relative"
								controls
								preload="auto"
							/>
						</Show>
					</div>
				</Match>
				<Match when={props.data.type === "audio"}>
					<div
						class={classNames(
							"w-full h-full relative z-10 bg-input-base flex justify-center items-center",
						)}
					>
						<Show when={renderNativeMedia()}>
							{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
							<audio src={props.data.url} class="w-2/3" controls />
						</Show>
					</div>
				</Match>
			</Switch>
			<Show when={props.progress?.active}>
				<div class="absolute inset-x-0 bottom-0 z-20">
					<ProgressBar
						progress={props.progress?.value ?? 0}
						type="target"
						variant="edge"
					/>
				</div>
			</Show>
		</div>
	);
};

type PreviewQuickAction = {
	label: string;
	icon: ActionIconName;
	hide?: boolean;
	disabled?: boolean;
	loading?: boolean;
	theme?: "primary";
	onClick: () => void;
};

const PreviewActionButton: Component<{
	action: PreviewQuickAction;
}> = (props) => {
	return (
		<button
			type="button"
			disabled={props.action.disabled}
			title={props.action.label}
			aria-label={props.action.label}
			aria-busy={props.action.loading ? "true" : undefined}
			class={classNames(
				"pointer-events-auto inline-flex h-7 max-w-32 items-center gap-1.5 rounded-md border border-border bg-input-base px-2 text-xs font-medium text-subtitle shadow-sm transition-colors duration-200 hover:bg-background-hover hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60",
				{
					"border-primary-base/60 bg-input-base text-primary-base hover:bg-primary-base/10 hover:text-primary-base":
						props.action.theme === "primary" && !props.action.disabled,
				},
			)}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				if (props.action.disabled) return;
				props.action.onClick();
			}}
		>
			<Show
				when={props.action.loading}
				fallback={<ActionIcon icon={props.action.icon} size={13} />}
			>
				<Spinner size="sm" />
			</Show>
			<span class="truncate">{props.action.label}</span>
		</button>
	);
};
