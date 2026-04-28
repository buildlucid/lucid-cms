import type { ErrorResult, Media } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowRotateLeft,
	FaSolidArrowUpFromBracket,
	FaSolidBullseye,
	FaSolidFile,
	FaSolidMagnifyingGlass,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Match,
	Show,
	Switch,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import FocalPointEditor, {
	type FocalPoint,
} from "@/components/Modals/Media/FocalPointEditor";
import ProgressBar from "@/components/Partials/ProgressBar";
import T from "@/translations";
import helpers from "@/utils/helpers";

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
		name?: string;
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
						props.state.setValue(e.currentTarget.files[0]);
						props.state.setRemovedCurrent(false);
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
						props.state.setValue(e.dataTransfer.files[0]);
						props.state.setRemovedCurrent(false);
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
							actions={{
								clearFile,
								uploadFile,
							}}
						/>
					</Match>
					<Match when={showState() === "no-file"}>
						<div class="w-full h-full flex justify-center items-center flex-col p-4 md:p-6">
							<FaSolidArrowUpFromBracket class="w-7 h-7 mx-auto text-unfocused mb-5" />
							<p class="text-center text-base font-medium text-subtitle">
								{T()("drag_and_drop_file_or")}{" "}
								<button
									type="button"
									onClick={openFileBrowser}
									class="text-primary-base font-medium"
								>
									{T()("upload_here")}
								</button>
							</p>
							<Show when={props.currentFile !== undefined}>
								<div class="mt-5 text-center flex flex-col items-center">
									<Show when={props.disableRemoveCurrent !== true}>
										<p class="text-sm">
											{T()("if_left_blank_file_will_be_removed")}
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
												{T()("back_to_current_file")}
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
							actions={{
								clearFile: props.disableRemoveCurrent ? undefined : clearFile,
								downloadFile,
								uploadFile,
							}}
						/>
					</Match>
				</Switch>
			</div>
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
	actions: {
		clearFile?: () => void;
		downloadFile?: () => void;
		uploadFile: () => void;
	};
}

const FilePreviewScreen: Component<FilePreviewScreenProps> = (props) => {
	// ------------------------------------
	// State
	const [focalEditorOpen, setFocalEditorOpen] = createSignal(false);

	// ------------------------------------
	// Classes
	const actionButtonClasses = classNames(
		"bg-input-base text-input-contrast hover:text-secondary-contrast border border-border h-8 flex justify-center items-center font-medium text-sm py-2 px-2 rounded-md transition-all duration-200 hover:bg-secondary-hover focus:outline-hidden focus-visible:ring-1 focus:ring-primary-base",
	);
	const showFocalPoint = createMemo(
		() => props.data.type === "image" && props.focalPoint !== undefined,
	);

	// ------------------------------------
	// Render
	return (
		<div class="relative w-full h-full flex justify-center items-center flex-col">
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
			<Switch
				fallback={
					<div
						class={classNames(
							"w-full h-[calc(100%-49px)] relative z-10 bg-input-base flex flex-col justify-center items-center",
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
							"w-full h-[calc(100%-49px)] relative z-10 p-4 rectangle-background",
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
							"w-full h-[calc(100%-49px)] relative z-10 bg-input-base rectangle-background",
						)}
					>
						{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
						<video
							src={props.data.url}
							class="w-full h-full object-contain z-10 relative"
							controls
							preload="auto"
						/>
					</div>
				</Match>
				<Match when={props.data.type === "audio"}>
					<div
						class={classNames(
							"w-full h-[calc(100%-49px)] relative z-10 bg-input-base flex justify-center items-center",
						)}
					>
						{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
						<audio src={props.data.url} class="w-2/3" controls />
					</div>
				</Match>
			</Switch>
			<Show when={props.progress?.active}>
				<div class="absolute inset-x-0 bottom-12.25 z-20">
					<ProgressBar
						progress={props.progress?.value ?? 0}
						type="target"
						variant="edge"
					/>
				</div>
			</Show>
			<div
				class={classNames(
					"w-full z-10 relative grid gap-2 p-2 bg-background-base border-t border-border",
					{
						"grid-cols-2":
							[
								props.actions.downloadFile,
								showFocalPoint() ? true : undefined,
								props.actions.uploadFile,
								props.actions.clearFile,
							].filter(Boolean).length === 2,
						"grid-cols-3":
							[
								props.actions.downloadFile,
								showFocalPoint() ? true : undefined,
								props.actions.uploadFile,
								props.actions.clearFile,
							].filter(Boolean).length === 3,
						"grid-cols-4":
							[
								props.actions.downloadFile,
								showFocalPoint() ? true : undefined,
								props.actions.uploadFile,
								props.actions.clearFile,
							].filter(Boolean).length === 4,
					},
				)}
			>
				<Show when={props.actions.downloadFile !== undefined}>
					<button
						type="button"
						class={classNames(actionButtonClasses)}
						onClick={() => {
							if (props.actions.downloadFile !== undefined)
								props.actions.downloadFile();
						}}
					>
						<FaSolidMagnifyingGlass class="block md:mr-2 text-current" />
						<span class="hidden md:inline">{T()("preview")}</span>
					</button>
				</Show>
				<Show when={showFocalPoint()}>
					<button
						type="button"
						class={classNames(actionButtonClasses)}
						onClick={() => setFocalEditorOpen(true)}
					>
						<FaSolidBullseye class="block md:mr-2 text-current" />
						<span class="hidden md:inline">{T()("focal_point")}</span>
					</button>
				</Show>
				<button
					type="button"
					class={classNames(actionButtonClasses)}
					onClick={() => {
						props.actions.uploadFile();
					}}
				>
					<FaSolidArrowUpFromBracket class="block md:mr-2 text-current" />
					<span class="hidden md:inline">{T()("choose_file")}</span>
				</button>
				<Show when={props.actions.clearFile !== undefined}>
					<button
						type="button"
						class={classNames(actionButtonClasses)}
						onClick={() => {
							if (props.actions.clearFile !== undefined)
								props.actions.clearFile();
						}}
					>
						<FaSolidXmark class="block md:mr-2 text-current" />
						<span class="hidden md:inline">{T()("remove")}</span>
					</button>
				</Show>
			</div>
		</div>
	);
};
