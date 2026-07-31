import type { ErrorResult } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowRotateLeft,
	FaSolidArrowUpFromBracket,
	FaSolidCrop,
	FaSolidImage,
	FaSolidTrash,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import Button from "@/components/Partials/Button";
import ProgressBar from "@/components/Partials/ProgressBar";
import T from "@/translations";
import { ErrorMessage } from "./ErrorMessage";
import { Label } from "./Label";
import type {
	SingleFileUploadImageCrop,
	SingleFileUploadProps,
} from "./SingleFileUpload";

export interface CompactImageUploadProps {
	id: string;
	name: string;
	state: SingleFileUploadProps["state"];
	currentFile?: SingleFileUploadProps["currentFile"];
	copy?: {
		label?: string;
	};
	accept?: string;
	required?: boolean;
	disabled?: boolean;
	disableRemoveCurrent?: boolean;
	progress?: SingleFileUploadProps["progress"];
	imageCrop?: SingleFileUploadImageCrop;
	errors?: ErrorResult;
	noMargin?: boolean;
	hideOptionalText?: boolean;
}

const CompactImageUpload: Component<CompactImageUploadProps> = (props) => {
	// ----------------------------------------
	// State & Refs
	const [dragOver, setDragOver] = createSignal(false);
	const [newFileUrl, setNewFileUrl] = createSignal<string>();
	let inputRef: HTMLInputElement | undefined;

	// ----------------------------------------
	// Memos
	const state = createMemo<"new" | "current" | "empty">(() => {
		if (props.state.value) return "new";
		if (!props.state.removedCurrent && props.currentFile?.url) return "current";
		return "empty";
	});
	const previewUrl = createMemo(() =>
		state() === "new" ? newFileUrl() : props.currentFile?.url,
	);
	const fileName = createMemo(() => {
		if (state() === "new") return props.state.value?.name;
		if (state() === "current") return props.currentFile?.name;
		return T()("media.image.compact.empty");
	});
	const fileStatus = createMemo(() => {
		if (state() === "new") return T()("media.image.compact.pending");
		if (state() === "current") return T()("media.image.compact.current");
		return T()("media.image.compact.help");
	});

	// ----------------------------------------
	// Functions
	const openFileBrowser = () => {
		if (!props.disabled) inputRef?.click();
	};
	const fileMatchesAccept = (file: File) => {
		const accept = props.accept ?? "image/*";

		return accept.split(",").some((item) => {
			const value = item.trim().toLowerCase();
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
		if (props.disabled || !fileMatchesAccept(file)) return;
		props.state.setValue(file);
		props.state.setRemovedCurrent(false);
	};
	const removeFile = () => {
		props.state.setValue(null);
		props.state.setRemovedCurrent(true);
	};
	const restoreCurrentFile = () => {
		props.state.setValue(null);
		props.state.setRemovedCurrent(false);
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const file = props.state.value;
		if (!file) {
			setNewFileUrl(undefined);
			return;
		}

		const url = URL.createObjectURL(file);
		setNewFileUrl(url);
		onCleanup(() => URL.revokeObjectURL(url));
	});

	// ----------------------------------------
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
				theme="basic"
				hideOptionalText={props.hideOptionalText}
			/>
			<input
				ref={inputRef}
				id={props.id}
				name={props.name}
				type="file"
				accept={props.accept ?? "image/*"}
				class="hidden"
				disabled={props.disabled}
				onChange={(event) => {
					const file = event.currentTarget.files?.[0];
					if (file) selectFile(file);
					event.currentTarget.value = "";
				}}
			/>
			{/** biome-ignore lint/a11y/noStaticElementInteractions: drag and drop supplements the labelled file input and buttons */}
			<div
				class={classNames(
					"relative flex flex-col gap-3 overflow-hidden rounded-md border border-border bg-input-base/35 p-3 transition-colors sm:flex-row sm:items-center",
					{
						"border-primary-base bg-primary-muted-bg/20": dragOver(),
						"opacity-60": props.disabled,
					},
				)}
				onDragOver={(event) => {
					if (props.disabled) return;
					event.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={(event) => {
					event.preventDefault();
					setDragOver(false);
				}}
				onDrop={(event) => {
					event.preventDefault();
					setDragOver(false);
					const file = event.dataTransfer?.files[0];
					if (file) selectFile(file);
				}}
			>
				<button
					type="button"
					class={classNames(
						"grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background-base focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base",
						{
							"border-border": state() !== "empty",
							"rectangle-background": state() !== "empty",
							"border-dashed border-border hover:border-primary-base":
								state() === "empty",
						},
					)}
					onClick={openFileBrowser}
					disabled={props.disabled}
					aria-label={
						state() === "empty"
							? T()("media.file.choose")
							: T()("media.file.replace")
					}
				>
					<Show
						when={previewUrl()}
						fallback={
							<span class="flex flex-col items-center gap-1.5 text-icon-faded">
								<FaSolidImage class="size-5" />
								<FaSolidArrowUpFromBracket class="size-3" />
							</span>
						}
					>
						{(url) => (
							<img
								src={url()}
								alt=""
								class="relative z-10 size-full object-contain p-2"
							/>
						)}
					</Show>
				</button>

				<div class="min-w-0 flex-1">
					<p
						class="truncate text-sm font-medium text-subtitle"
						title={fileName()}
					>
						{fileName()}
					</p>
					<p class="mt-0.5 text-xs">{fileStatus()}</p>
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<Button
							type="button"
							theme="border-outline"
							size="small"
							onClick={openFileBrowser}
							disabled={props.disabled}
						>
							<FaSolidArrowUpFromBracket class="mr-1.5 size-3" />
							{state() === "empty"
								? T()("media.file.choose")
								: T()("media.file.replace")}
						</Button>
						<Show when={state() !== "empty" ? props.imageCrop : undefined}>
							{(imageCrop) => (
								<>
									<Button
										type="button"
										theme="secondary-subtle"
										size="small"
										onClick={imageCrop().callbacks.open}
										disabled={props.disabled || imageCrop().state.disabled}
										title={imageCrop().state.tooltip}
									>
										<FaSolidCrop class="mr-1.5 size-3" />
										{T()("media.crop.action")}
									</Button>
									<Show when={imageCrop().state.hasCrop}>
										<Button
											type="button"
											theme="danger-subtle"
											size="small"
											onClick={imageCrop().callbacks.remove}
											disabled={props.disabled || imageCrop().state.disabled}
										>
											<FaSolidTrash class="mr-1.5 size-3" />
											{T()("media.crop.remove")}
										</Button>
									</Show>
								</>
							)}
						</Show>
						<Show
							when={
								state() !== "empty" &&
								!(state() === "current" && props.disableRemoveCurrent === true)
							}
						>
							<Button
								type="button"
								theme="danger-subtle"
								size="small"
								onClick={removeFile}
								disabled={props.disabled}
							>
								<FaSolidTrash class="mr-1.5 size-3" />
								{T()("common.remove")}
							</Button>
						</Show>
						<Show
							when={
								state() === "empty" &&
								props.state.removedCurrent &&
								props.currentFile !== undefined
							}
						>
							<Button
								type="button"
								theme="secondary-subtle"
								size="small"
								onClick={restoreCurrentFile}
								disabled={props.disabled}
							>
								<FaSolidArrowRotateLeft class="mr-1.5 size-3" />
								{T()("media.file.back.to.current")}
							</Button>
						</Show>
					</div>
				</div>

				<Show when={props.progress?.active}>
					<div class="absolute inset-x-0 bottom-0">
						<ProgressBar
							progress={props.progress?.value ?? 0}
							type="target"
							variant="edge"
						/>
					</div>
				</Show>
			</div>
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};

export default CompactImageUpload;
