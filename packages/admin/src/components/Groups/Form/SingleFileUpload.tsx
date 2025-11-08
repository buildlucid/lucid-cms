import T from "@/translations";
import {
	type Component,
	Switch,
	createMemo,
	Match,
	Show,
	createEffect,
	createSignal,
} from "solid-js";
import classNames from "classnames";
import {
	FaSolidArrowUpFromBracket,
	FaSolidArrowRotateLeft,
	FaSolidMagnifyingGlass,
	FaSolidXmark,
	FaSolidFile,
} from "solid-icons/fa";
import helpers from "@/utils/helpers";
import type { ErrorResult, MediaResponse } from "@types";
import { Label, DescribedBy, ErrorMessage } from "@/components/Groups/Form";

export interface SingleFileUploadProps {
	id: string;

	state: {
		value: File | null;
		setValue: (_value: File | null) => void;
		removedCurrent: boolean;
		setRemovedCurrent: (_value: boolean) => void;
	};
	currentFile?: {
		type?: MediaResponse["type"];
		url?: string;
		name?: string;
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
							actions={{
								clearFile,
								uploadFile,
							}}
						/>
					</Match>
					<Match when={showState() === "no-file"}>
						<div class="w-full h-full flex justify-center items-center flex-col p-4 md:p-6">
							<FaSolidArrowUpFromBracket class="w-7 h-7 mx-auto text-unfocused mb-5" />
							<p class="text-center text-base font-medium text-title">
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
								type: props.currentFile?.type as MediaResponse["type"],
								name: props.currentFile?.name as string,
							}}
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
		type: MediaResponse["type"];
		name: string;
	};
	actions: {
		clearFile?: () => void;
		downloadFile?: () => void;
		uploadFile: () => void;
	};
}

const FilePreviewScreen: Component<FilePreviewScreenProps> = (props) => {
	// ------------------------------------
	// Classes
	const actionButtonClasses = classNames(
		"bg-input-base text-input-contrast hover:text-secondary-contrast border border-border h-8 flex justify-center items-center font-medium text-sm py-2 px-2 rounded-md transition-all duration-200 hover:bg-secondary-hover focus:outline-hidden focus-visible:ring-1 focus:ring-primary-base",
	);

	// ------------------------------------
	// Render
	return (
		<div class="relative w-full h-full flex justify-center items-center flex-col">
			<Switch
				fallback={
					<div class="w-full h-[calc(100%-49px)] relative z-10 bg-input-base flex flex-col justify-center items-center">
						<FaSolidFile class="w-10 h-10 mx-auto text-unfocused mb-5" />
						<Show when={props.data.name}>
							<p class="text-center text-sm font-medium text-title">
								{props.data.name}
							</p>
						</Show>
					</div>
				}
			>
				<Match when={props.data.type === "image"}>
					<div class="w-full h-[calc(100%-49px)] relative z-10 p-4">
						<img
							src={props.data.url}
							alt={props.data.name}
							class="w-full h-full object-contain"
						/>
					</div>
					{/* BG */}
					<span
						class="absolute inset-0 z-0 bg-cover bg-center w-full h-full blur-md scale-110 after:block after:absolute after:inset-0 after:bg-black after:opacity-30 after:z-10"
						style={{
							"background-image": `url(${props.data.url})`,
						}}
					/>
				</Match>
				<Match when={props.data.type === "video"}>
					<div class="w-full h-[calc(100%-49px)] relative z-10 bg-input-base">
						{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
						<video
							src={props.data.url}
							class="w-full h-full object-contain"
							controls
							preload="auto"
						/>
					</div>
				</Match>
				<Match when={props.data.type === "audio"}>
					<div class="w-full h-[calc(100%-49px)] relative z-10 bg-input-base flex justify-center items-center">
						{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
						<audio src={props.data.url} class="w-2/3" controls />
					</div>
				</Match>
			</Switch>
			<div
				class={classNames(
					"w-full z-10 relative grid gap-2 p-2 bg-background-base border-t border-border",
					{
						"grid-cols-2":
							props.actions.downloadFile === undefined ||
							props.actions.clearFile === undefined,
						"grid-cols-3":
							props.actions.downloadFile !== undefined &&
							props.actions.clearFile !== undefined,
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
