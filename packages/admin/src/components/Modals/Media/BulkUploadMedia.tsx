import { useQueryClient } from "@tanstack/solid-query";
import type { ErrorResponse } from "@types";
import classNames from "classnames";
import { nanoid } from "nanoid";
import {
	FaSolidArrowUpFromBracket,
	FaSolidCheck,
	FaSolidFile,
	FaSolidTriangleExclamation,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
	untrack,
} from "solid-js";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import ProgressBar from "@/components/Partials/ProgressBar";
import { createSingleReq } from "@/services/api/media/useCreateSingle";
import { createUploadSessionReq } from "@/services/api/media/useCreateUploadSession";
import T from "@/translations";
import { validateSetError } from "@/utils/error-handling";
import helpers from "@/utils/helpers";
import { getImageMeta } from "@/utils/media-meta";
import { uploadMediaFile } from "@/utils/upload-session";

type UploadStatus = "queued" | "uploading" | "creating" | "success" | "error";

type UploadItem = {
	id: string;
	file: File;
	status: UploadStatus;
	progress: number;
	error?: ErrorResponse;
};

interface BulkUploadMediaModalProps {
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		parentFolderId: Accessor<number | string | undefined>;
	};
	initialFiles?: Accessor<File[]>;
}

const fileFingerprint = (file: File) =>
	`${file.name}:${file.size}:${file.lastModified}`;

const BulkUploadMediaModal: Component<BulkUploadMediaModalProps> = (props) => {
	// ----------------------------------
	// State & Hooks
	let inputRef: HTMLInputElement | undefined;
	let scrollRef: HTMLDivElement | undefined;
	const rowRefs = new Map<string, HTMLDivElement>();
	const queryClient = useQueryClient();
	const [rows, setRows] = createSignal<UploadItem[]>([]);
	const [dragOver, setDragOver] = createSignal(false);
	const [isProcessing, setIsProcessing] = createSignal(false);

	// ----------------------------------
	// Memos
	const queuedCount = createMemo(
		() => rows().filter((row) => row.status === "queued").length,
	);
	const errorCount = createMemo(
		() => rows().filter((row) => row.status === "error").length,
	);
	const successCount = createMemo(
		() => rows().filter((row) => row.status === "success").length,
	);
	const totalCount = createMemo(() => rows().length);
	const allSuccessful = createMemo(
		() => totalCount() > 0 && successCount() === totalCount(),
	);
	const primaryLabel = createMemo(() => {
		if (isProcessing()) return T()("uploading");
		if (queuedCount() > 0) return T()("upload");
		if (errorCount() > 0) return T()("retry_failed");
		if (allSuccessful()) return T()("done");
		return T()("upload");
	});
	const secondaryLabel = createMemo(() => {
		if (!isProcessing() && (errorCount() > 0 || allSuccessful())) {
			return T()("done");
		}
		return T()("close");
	});
	const primaryDisabled = createMemo(() => {
		if (isProcessing()) return true;
		if (allSuccessful()) return false;
		return queuedCount() === 0 && errorCount() === 0;
	});
	const resolvedFolderId = createMemo(() => {
		const folderId = props.state.parentFolderId();
		if (folderId === undefined || folderId === "") return null;
		return typeof folderId === "string"
			? Number.parseInt(folderId, 10)
			: folderId;
	});

	// ----------------------------------
	// Functions
	const resetInput = () => {
		if (inputRef) inputRef.value = "";
	};
	const addFiles = (files: File[]) => {
		if (files.length === 0) return;

		setRows((currentRows) => {
			const fingerprints = new Set(
				currentRows.map((row) => fileFingerprint(row.file)),
			);
			const newRows = files
				.filter((file) => {
					const fingerprint = fileFingerprint(file);
					if (fingerprints.has(fingerprint)) return false;
					fingerprints.add(fingerprint);
					return true;
				})
				.map<UploadItem>((file) => ({
					id: nanoid(),
					file,
					status: "queued",
					progress: 0,
				}));

			return [...currentRows, ...newRows];
		});
	};
	const openFileBrowser = () => {
		inputRef?.click();
	};
	const removeRow = (id: string) => {
		setRows((currentRows) =>
			currentRows.filter((row) => row.id !== id || row.status !== "queued"),
		);
		rowRefs.delete(id);
	};
	const updateRow = (id: string, data: Partial<UploadItem>) => {
		setRows((currentRows) =>
			currentRows.map((row) =>
				row.id === id
					? {
							...row,
							...data,
						}
					: row,
			),
		);
	};
	const scrollRowToTop = (id: string) => {
		window.requestAnimationFrame(() => {
			const container = scrollRef;
			const row = rowRefs.get(id);
			if (!container || !row) return;

			const containerRect = container.getBoundingClientRect();
			const rowRect = row.getBoundingClientRect();
			container.scrollTo({
				top: container.scrollTop + rowRect.top - containerRect.top,
				behavior: "smooth",
			});
		});
	};
	const invalidateMediaQueries = () => {
		queryClient.invalidateQueries({
			queryKey: ["media.getMultiple"],
		});
		queryClient.invalidateQueries({
			queryKey: ["mediaFolders.getMultiple"],
		});
	};
	const uploadRow = async (row: UploadItem) => {
		updateRow(row.id, {
			status: "uploading",
			progress: 0,
			error: undefined,
		});
		scrollRowToTop(row.id);

		const uploadRes = await uploadMediaFile({
			file: row.file,
			scope: "media:bulk:create:true",
			start: () =>
				createUploadSessionReq({
					body: {
						fileName: row.file.name,
						mimeType: row.file.type,
						size: row.file.size,
						public: true,
					},
				}),
			onProgress: (progress) => updateRow(row.id, { progress }),
		});

		if (uploadRes.error) {
			updateRow(row.id, {
				status: "error",
				error: uploadRes.error,
				progress: 0,
			});
			return false;
		}

		updateRow(row.id, {
			status: "creating",
			progress: 100,
		});

		try {
			const imageMeta = await getImageMeta(row.file);
			await createSingleReq({
				key: uploadRes.data,
				fileName: row.file.name,
				folderId: resolvedFolderId(),
				width: imageMeta?.width,
				height: imageMeta?.height,
				blurHash: imageMeta?.blurHash,
				averageColor: imageMeta?.averageColor,
				base64: imageMeta?.base64,
				isDark: imageMeta?.isDark,
				isLight: imageMeta?.isLight,
			});

			updateRow(row.id, {
				status: "success",
				progress: 100,
				error: undefined,
			});
			return true;
		} catch (error) {
			updateRow(row.id, {
				status: "error",
				error: validateSetError(error),
				progress: 0,
			});
			return false;
		}
	};
	const processQueuedRows = async () => {
		if (isProcessing()) return;
		setIsProcessing(true);

		let createdAny = false;
		try {
			while (true) {
				const nextRow = rows().find((row) => row.status === "queued");
				if (!nextRow) break;
				const success = await uploadRow(nextRow);
				if (success) createdAny = true;
			}
		} finally {
			setIsProcessing(false);
			if (createdAny) invalidateMediaQueries();
		}
	};
	const retryFailedRows = async () => {
		setRows((currentRows) =>
			currentRows.map((row) =>
				row.status === "error"
					? {
							...row,
							status: "queued",
							progress: 0,
							error: undefined,
						}
					: row,
			),
		);
		await processQueuedRows();
	};
	const primaryAction = async () => {
		if (allSuccessful()) {
			props.state.setOpen(false);
			return;
		}
		if (queuedCount() > 0) {
			await processQueuedRows();
			return;
		}
		if (errorCount() > 0) {
			await retryFailedRows();
		}
	};
	const closeModal = () => {
		if (isProcessing()) return;
		props.state.setOpen(false);
	};
	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		setDragOver(false);
		addFiles(Array.from(event.dataTransfer?.files ?? []));
		resetInput();
	};
	const rowStatusLabel = (status: UploadStatus) => {
		if (status === "queued") return T()("queued");
		if (status === "uploading") return T()("uploading");
		if (status === "creating") return T()("creating_media");
		if (status === "success") return T()("completed");
		return T()("failed");
	};
	const rowStatusClasses = (status: UploadStatus) =>
		classNames("text-xs font-medium", {
			"text-unfocused": status === "queued",
			"text-primary-base": status === "uploading" || status === "creating",
			"text-success-base": status === "success",
			"text-error-base": status === "error",
		});

	// ----------------------------------
	// Effects
	createEffect(() => {
		const files = props.initialFiles?.() ?? [];
		if (!props.state.open || files.length === 0) return;
		untrack(() => addFiles(files));
	});

	createEffect(() => {
		if (!props.state.open) {
			setRows([]);
			setDragOver(false);
			setIsProcessing(false);
			rowRefs.clear();
			resetInput();
		}
	});

	onCleanup(() => {
		rowRefs.clear();
	});

	// ----------------------------------
	// Render
	return (
		<Modal
			state={{
				open: props.state.open,
				setOpen: closeModal,
			}}
			options={{
				noPadding: true,
			}}
		>
			<div class="flex max-h-[calc(100vh-2rem)] flex-col">
				<input
					ref={inputRef}
					type="file"
					multiple
					class="hidden"
					onChange={(event) => {
						addFiles(Array.from(event.currentTarget.files ?? []));
						resetInput();
					}}
				/>

				{/* biome-ignore lint/a11y/noStaticElementInteractions: drag/drop region */}
				<div
					ref={scrollRef}
					class={classNames(
						"max-h-[60vh] overflow-y-auto p-4 md:p-6 transition-colors",
						{
							"bg-primary-base/5": dragOver(),
						},
					)}
					onDragOver={(event) => {
						event.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={(event) => {
						event.preventDefault();
						if (event.currentTarget === event.target) setDragOver(false);
					}}
					onDrop={onDrop}
				>
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<h2 class="text-base font-semibold text-title">
								{T()("bulk_upload_media")}
							</h2>
							<p class="mt-1 text-base text-body">
								{T()("bulk_upload_media_description")}
							</p>
						</div>
						<Button
							type="button"
							theme="secondary-subtle"
							size="icon-subtle"
							onClick={closeModal}
							disabled={isProcessing()}
							aria-label={T()("close")}
						>
							<FaSolidXmark size={14} />
						</Button>
					</div>
					<Show
						when={rows().length > 0}
						fallback={
							<div class="mt-4 flex min-h-72 flex-col items-center justify-center rounded-md border-2 border-dashed border-border p-6 text-center">
								<FaSolidArrowUpFromBracket class="mb-5 h-7 w-7 text-unfocused" />
								<p class="text-base font-medium text-subtitle">
									{T()("bulk_upload_drop_files")}{" "}
									<button
										type="button"
										class="font-medium text-primary-base"
										onClick={openFileBrowser}
									>
										{T()("upload_here")}
									</button>
								</p>
								<p class="mt-2 text-sm text-body">
									{T()("bulk_upload_drop_files_description")}
								</p>
							</div>
						}
					>
						<div class="mt-4 flex flex-col gap-2">
							<For each={rows()}>
								{(row) => (
									<div
										ref={(el) => rowRefs.set(row.id, el)}
										class={classNames(
											"relative overflow-hidden rounded-md border border-border bg-card-base p-3 transition-colors",
											{
												"border-primary-base": row.status === "uploading",
												"border-error-base/60": row.status === "error",
											},
										)}
									>
										<div class="grid grid-cols-[2rem_1fr_auto] items-center gap-3">
											<div class="flex h-8 w-8 items-center justify-center rounded-md bg-input-base text-icon-base">
												<Show
													when={row.status === "success"}
													fallback={
														<Show
															when={row.status === "error"}
															fallback={<FaSolidFile size={14} />}
														>
															<FaSolidTriangleExclamation size={14} />
														</Show>
													}
												>
													<FaSolidCheck size={14} />
												</Show>
											</div>
											<div class="min-w-0">
												<p class="truncate text-sm font-medium text-subtitle">
													{row.file.name}
												</p>
												<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
													<span class="text-xs text-body">
														{helpers.bytesToSize(row.file.size)}
													</span>
													<span class="text-xs text-body">
														{row.file.type || T()("unknown")}
													</span>
													<span class={rowStatusClasses(row.status)}>
														{rowStatusLabel(row.status)}
													</span>
												</div>
												<Show when={row.error}>
													{(error) => (
														<p class="mt-2 text-xs text-error-base">
															{error().message}
														</p>
													)}
												</Show>
											</div>
											<Show when={row.status === "queued"}>
												<Button
													type="button"
													theme="danger-subtle"
													size="icon-subtle"
													onClick={() => removeRow(row.id)}
													disabled={isProcessing()}
													aria-label={T()("remove")}
												>
													<FaSolidXmark size={14} />
												</Button>
											</Show>
										</div>
										<Show
											when={
												row.status === "uploading" || row.status === "creating"
											}
										>
											<div class="absolute right-0 bottom-0 left-0">
												<ProgressBar
													progress={row.progress}
													type="target"
													variant="edge-thin"
												/>
											</div>
										</Show>
									</div>
								)}
							</For>
							<button
								type="button"
								class="mt-2 flex min-h-14 items-center justify-center rounded-md border border-dashed border-border px-4 text-sm font-medium text-body transition-colors hover:border-primary-base hover:bg-primary-base/5 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base"
								onClick={openFileBrowser}
								disabled={isProcessing()}
							>
								<FaSolidArrowUpFromBracket class="mr-2" size={14} />
								{T()("add_more_files")}
							</button>
						</div>
					</Show>
				</div>
				<ModalFooter>
					<p class="text-sm text-subtitle">
						{T()("bulk_upload_summary", {
							total: totalCount(),
							completed: successCount(),
							failed: errorCount(),
						})}
					</p>
					<div class="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							theme="border-outline"
							size="medium"
							onClick={closeModal}
							disabled={isProcessing()}
						>
							{secondaryLabel()}
						</Button>
						<Button
							type="button"
							theme={
								errorCount() > 0 && queuedCount() === 0 ? "danger" : "primary"
							}
							size="medium"
							onClick={primaryAction}
							loading={isProcessing()}
							disabled={primaryDisabled()}
						>
							{primaryLabel()}
						</Button>
					</div>
				</ModalFooter>
			</div>
		</Modal>
	);
};

export default BulkUploadMediaModal;
