import { useQueryClient } from "@tanstack/solid-query";
import type {
	TransferImportCheck,
	TransferImportMode,
	TransferItemResult,
} from "@types";
import classNames from "classnames";
import {
	TbOutlineDownload,
	TbOutlineFileZip,
	TbOutlineX,
} from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import Alert from "@/components/Alert/Alert";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import Select, { type SelectOption } from "@/components/Select/Select";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import { createUploadSessionReq } from "@/services/api/media/useCreateUploadSession";
import { queryKeys } from "@/services/query-keys";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import downloadFile from "@/utils/download-file";
import { validateSetError } from "@/utils/error-handling";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import spawnToast from "@/utils/spawn-toast";
import {
	createTransferDownload,
	readTransferUpload,
	type TransferUpload,
} from "@/utils/transfer-archive";
import { uploadMediaFile } from "@/utils/upload-session";
import { ImportDropZone } from "./parts/ImportDropZone";
import { ImportMediaGroup } from "./parts/ImportMediaGroup";
import { ImportRow, type ImportRowProps } from "./parts/ImportRow";
import type { ImportItem } from "./types";
import { buildFailedExports } from "./utils/failed-exports";
import {
	applyCopies,
	isMediaEntry,
	isTransferEntry,
	linkedEntries,
	transferKey,
} from "./utils/import-entries";
import {
	itemOutcome,
	settleOutcome,
	statusVariants,
} from "./utils/import-outcome";

export interface ImportModalProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** @default "Import" */
	title?: string;
	description?: string;
	/** Only imports these resources from each file, eg. `["media"]` on the media page. Defaults to everything. */
	resources?: string[];
	/** Called once an import has saved something. */
	onSuccess?: () => void;
}

/**
 * Imports export files item by item: checks them first without saving, shows what each
 * entry will do, then imports them in order. Entries that succeed are kept when others fail,
 * and failed ones can be retried or downloaded as a smaller export to try later.
 *
 * @example
 * ```tsx
 * import { ImportModal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<ImportModal
 * 		open={open()}
 * 		onOpenChange={setOpen}
 * 		title="Import Bookings"
 * 		onSuccess={() => bookings.refetch()}
 * 	/>
 * );
 * ```
 */
const ImportModal: Component<ImportModalProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let inputRef: HTMLInputElement | undefined;
	const queryClient = useQueryClient();
	const [uploads, setUploads] = createSignal<TransferUpload[]>([]);
	const [checks, setChecks] = createSignal<TransferImportCheck[]>([]);
	const [items, setItems] = createSignal<ImportItem[]>([]);
	const [mode, setMode] = createSignal<TransferImportMode>("upsert");
	//* the mode the rows were planned with, which imports always use
	const [checkedMode, setCheckedMode] =
		createSignal<TransferImportMode>("upsert");
	const [phase, setPhase] = createSignal<"choose" | "review" | "import">(
		"choose",
	);
	const [checking, setChecking] = createSignal(false);
	const [running, setRunning] = createSignal(false);
	const [errors, setErrors] = createSignal<string[]>([]);

	// ----------------------------------------
	// Queries & Mutations
	const collections = api.collections.useGetAll({
		queryParams: {},
		enabled: () => props.open,
	});

	// ----------------------------------------
	// Memos
	const collectionLabels = createMemo(
		() =>
			new Map(
				(collections.data?.data ?? []).map((collection) => [
					collection.key,
					helpers.getLocaleValue({
						value: collection.details.labels.singular,
						fallback: collection.key,
					}),
				]),
			),
	);
	const resources = createMemo(
		() =>
			new Map(
				checks().flatMap((check) =>
					check.resources.map((resource) => [resource.key, resource]),
				),
			),
	);
	//* media files that come with other entries share one row, and are listed one by one when they're all there is
	const groupMedia = createMemo(() =>
		items().some((item) => item.resource !== "media"),
	);
	const mediaItems = createMemo(() =>
		groupMedia() ? items().filter((item) => item.resource === "media") : [],
	);
	const entryItems = createMemo(() =>
		groupMedia()
			? items().filter((item) => item.resource !== "media")
			: items(),
	);
	const importable = createMemo(() =>
		items().filter((item) => item.planned.status !== "failed"),
	);
	const blockedCount = createMemo(() => items().length - importable().length);
	//* includes entries the check found can't be imported, so they can be retried and downloaded too
	const failedItems = createMemo(() =>
		items().filter((item) => itemOutcome(item).status === "failed"),
	);
	//* entries the file holds in a form the server can't read stay failed
	const retryableItems = createMemo(() =>
		failedItems().filter((item) => item.valid),
	);
	const succeededCount = createMemo(
		() =>
			items().filter(
				(item) => item.state === "done" && item.result?.status !== "failed",
			).length,
	);
	const finished = createMemo(
		() =>
			phase() === "import" &&
			!running() &&
			items().every(
				(item) => item.state === "done" || item.planned.status === "failed",
			),
	);
	const modeOptions = createMemo(
		(): Array<SelectOption & { value: TransferImportMode }> => [
			{
				value: "upsert",
				label: T()("transfer.import.mode.upsert"),
				description: T()("transfer.import.mode.upsert.description"),
			},
			{
				value: "skip",
				label: T()("transfer.import.mode.skip"),
				description: T()("transfer.import.mode.skip.description"),
			},
			{
				value: "copy",
				label: T()("transfer.import.mode.copy"),
				description: T()("transfer.import.mode.copy.description"),
			},
		],
	);
	//* the choice only matters when entries that aren't reused are already on this site
	const showMode = createMemo(
		() =>
			phase() !== "choose" &&
			(mode() !== "upsert" ||
				items().some(
					(item) =>
						item.planned.id !== null && !resources().get(item.resource)?.reuse,
				)),
	);

	// ----------------------------------------
	// Functions
	const updateItem = (id: string, data: Partial<ImportItem>) => {
		setItems((current) =>
			current.map((item) => (item.id === id ? { ...item, ...data } : item)),
		);
	};
	const resetInput = () => {
		if (inputRef) inputRef.value = "";
	};
	const check = async (
		files: TransferUpload[],
		checkMode: TransferImportMode,
	) => {
		setChecking(true);
		try {
			const responses = await Promise.all(
				files.map((upload) =>
					api.transfer.checkImportReq({
						body: { file: upload.file, mode: checkMode },
					}),
				),
			);
			const checked = responses.map((response) => response.data);
			setUploads(files);
			setCheckedMode(checkMode);
			setChecks(checked);
			setItems(
				checked.flatMap((result, index) => {
					const upload = files[index];
					if (!upload) return [];

					const entries = new Map(
						Object.entries(upload.file.resources).flatMap(([resource, list]) =>
							(list ?? []).flatMap((original: unknown) => {
								if (!isTransferEntry(original)) return [];
								const entry = applyCopies(resource, original, result.copies);
								return [[transferKey(resource, entry.uid), entry] as const];
							}),
						),
					);
					return result.items.map((planned, position) => {
						const entry = entries.get(
							transferKey(planned.resource, planned.uid),
						);
						return {
							id: `${index}:${position}:${transferKey(planned.resource, planned.uid)}`,
							upload,
							resource: planned.resource,
							entry: entry ?? { uid: planned.uid },
							valid: entry !== undefined,
							planned,
							state: "waiting",
							progress: 0,
						};
					});
				}),
			);
			setPhase("review");
		} catch (error) {
			//* the rows stay as they were planned, so the choice goes back with them
			setErrors((current) => [...current, validateSetError(error).message]);
			setMode(checkedMode());
			if (phase() !== "review") setPhase("choose");
		} finally {
			setChecking(false);
		}
	};
	const addFiles = async (files: File[]) => {
		if (files.length === 0) return;
		setErrors([]);

		const read = await Promise.all(
			files.map((file) =>
				readTransferUpload(file).catch(() => {
					setErrors((current) => [
						...current,
						T()("transfer.import.file.invalid", { name: file.name }),
					]);
					return undefined;
				}),
			),
		);
		const valid = read.flatMap((upload) => {
			if (!upload) return [];
			const allowed = props.resources;
			if (!allowed) return [upload];

			const resources = Object.fromEntries(
				Object.entries(upload.file.resources).filter(([key]) =>
					allowed.includes(key),
				),
			);
			if (Object.values(resources).every((list) => !list?.length)) {
				setErrors((current) => [
					...current,
					T()("transfer.import.file.empty", { name: upload.name }),
				]);
				return [];
			}
			return [{ ...upload, file: { ...upload.file, resources } }];
		});
		if (valid.length === 0) return;

		await check(valid, mode());
	};
	const changeMode = (value: TransferImportMode) => {
		setMode(value);
		setErrors([]);
		void check(uploads(), value);
	};
	const importItem = async (
		item: ImportItem,
		pending: Set<string>,
		importMode: TransferImportMode,
		final = false,
	): Promise<TransferItemResult> => {
		const failed = (message: string): TransferItemResult => ({
			...item.planned,
			status: "failed",
			warnings: [],
			error: { message },
			retry: false,
		});

		let upload: { key: string } | undefined;
		const bytes = item.entry.file
			? item.upload.files.get(item.entry.file)
			: undefined;
		//* reused media is matched by uid, so only new files are uploaded. Upload sessions also
		//* need permission to update media, so without it the server downloads the file instead.
		const media = isMediaEntry(item.entry) ? item.entry : undefined;
		if (
			media &&
			bytes &&
			item.planned.status === "created" &&
			userStore.get.hasPermission([
				Permissions.MediaCreate,
				Permissions.MediaUpdate,
			]).all
		) {
			updateItem(item.id, { state: "uploading", progress: 0 });
			const file = new File([bytes], media.fileName, { type: media.mimeType });
			const uploadRes = await uploadMediaFile({
				file,
				scope: `transfer:${media.uid}`,
				start: () =>
					createUploadSessionReq({
						body: {
							fileName: media.fileName,
							mimeType: media.mimeType,
							size: file.size,
							public: media.public,
						},
					}),
				onProgress: (progress) => updateItem(item.id, { progress }),
			});
			if (uploadRes.error) return failed(uploadRes.error.message);
			upload = { key: uploadRes.data };
		}

		updateItem(item.id, { state: "importing", progress: 100 });
		try {
			const response = await api.transfer.importEntryReq({
				body: {
					source: { instanceId: item.upload.file.source.instanceId },
					resource: item.resource,
					entry: item.entry,
					mode: importMode,
					pending: linkedEntries(item.entry).filter((linked) =>
						pending.has(transferKey(linked.resource, linked.uid)),
					),
					final,
					upload,
				},
			});
			return response.data;
		} catch (error) {
			return failed(validateSetError(error).message);
		}
	};
	/** Imports entries again to make links held back for them, returning whether any got further. */
	const reimport = async (
		targets: ImportItem[],
		pending: Set<string>,
		final = false,
	) => {
		let progressed = false;
		for (const target of targets) {
			const key = transferKey(target.resource, target.entry.uid);
			pending.delete(key);
			//* entries created in this import are completed even when skipping what was already here
			const result = await importItem(
				target,
				pending,
				target.createdAs ? "upsert" : checkedMode(),
				final,
			);
			if (result.status === "failed" && result.retry) pending.add(key);
			if (
				(target.result?.status === "failed" && result.status !== "failed") ||
				!result.retry
			) {
				progressed = true;
			}
			updateItem(target.id, {
				state: "done",
				...settleOutcome(target, result),
			});
		}
		return progressed;
	};
	const run = async (ids: string[]) => {
		if (running() || ids.length === 0) return;
		setPhase("import");
		setRunning(true);

		const batch = new Set(ids);
		setItems((current) =>
			current.map((item) =>
				batch.has(item.id) ? { ...item, state: "waiting", progress: 0 } : item,
			),
		);
		const pending = new Set(
			items()
				.filter((item) => batch.has(item.id))
				.map((item) => transferKey(item.resource, item.entry.uid)),
		);
		try {
			for (const id of ids) {
				const item = items().find((current) => current.id === id);
				if (!item) continue;

				pending.delete(transferKey(item.resource, item.entry.uid));
				const result = await importItem(
					item,
					pending,
					item.createdAs ? "upsert" : checkedMode(),
				);
				//* an entry that failed on links held back is tried again, so links to it are held back too
				if (result.status === "failed" && result.retry) {
					pending.add(transferKey(item.resource, item.entry.uid));
				}
				updateItem(id, { state: "done", ...settleOutcome(item, result) });
			}

			//* held back links are made once what they point to exists. Passes repeat while they
			//* unlock more entries, then a last pass makes what it can and reports the rest missing.
			let last = false;
			for (let pass = 0; pass <= ids.length; pass++) {
				const retrying = items().filter(
					(item) => batch.has(item.id) && item.result?.retry,
				);
				if (retrying.length === 0) break;

				const progressed = await reimport(retrying, pending, last);
				if (last) break;
				if (!progressed) {
					pending.clear();
					last = true;
				}
			}

			//* entries imported earlier that link to what this batch added
			const added = new Set(
				items()
					.filter(
						(item) =>
							batch.has(item.id) &&
							item.result &&
							item.result.status !== "failed",
					)
					.map((item) => transferKey(item.resource, item.entry.uid)),
			);
			await reimport(
				items().filter(
					(item) =>
						!batch.has(item.id) &&
						item.result !== undefined &&
						item.result.status !== "failed" &&
						linkedEntries(item.entry).some((linked) =>
							added.has(transferKey(linked.resource, linked.uid)),
						),
				),
				new Set(),
				true,
			);
		} finally {
			setRunning(false);
			queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() });
			queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
			queryClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
		}

		if (succeededCount() > 0) props.onSuccess?.();
		spawnToast({
			title: T()("toasts.transfer.import.title"),
			message: T()("toasts.transfer.import.message", {
				completed: succeededCount(),
				total: items().length,
			}),
			status: failedItems().length > 0 ? "warning" : "success",
		});
	};
	const downloadFailed = async () => {
		const failed = new Set(
			retryableItems().map((item) =>
				transferKey(item.resource, item.entry.uid),
			),
		);
		for (const failedExport of buildFailedExports(uploads(), items(), failed)) {
			const download = await createTransferDownload(failedExport.file, {
				bundle: (failedExport.file.resources.media ?? []).some(
					(entry) => entry.file,
				),
				files: failedExport.upload.files,
			});
			downloadFile(download.blob, `${failedExport.name}.${download.extension}`);
		}
	};
	const statusFor = (item: ImportItem): ImportRowProps["status"] => {
		if (item.state === "uploading" || item.state === "importing") {
			return {
				label: T()(`transfer.import.status.${item.state}`),
				variant: "primary-subtle",
			};
		}
		if (phase() === "import" && item.state === "waiting") {
			return { label: T()("common.status.queued"), variant: "outline" };
		}

		const current = itemOutcome(item);
		//* reused records, eg. media files, are already here rather than unchanged
		const reused =
			current.status === "unchanged" && resources().get(item.resource)?.reuse;
		return {
			label: T()(
				`transfer.import.${item.result ? "status" : "planned"}.${reused ? "reused" : current.status}`,
			),
			variant: statusVariants[current.status],
			tooltip:
				current.status === "requested"
					? T()("transfer.import.requested.tooltip")
					: undefined,
		};
	};
	const subtitleFor = (item: ImportItem) => {
		if (isMediaEntry(item.entry)) {
			return `${helpers.bytesToSize(item.entry.size)} · ${item.entry.mimeType}`;
		}
		const collectionKey =
			"collectionKey" in item.entry &&
			typeof item.entry.collectionKey === "string"
				? item.entry.collectionKey
				: undefined;
		if (collectionKey) {
			return collectionLabels().get(collectionKey) ?? collectionKey;
		}
		return resources().get(item.resource)?.label.singular ?? item.resource;
	};
	const hrefFor = (item: ImportItem) => {
		const id = item.result?.id;
		if (
			item.resource !== "documents" ||
			!id ||
			item.result?.status === "requested"
		) {
			return undefined;
		}
		const separator = id.lastIndexOf(":");
		return getDocumentRoute("edit", {
			collectionKey: id.slice(0, separator),
			documentId: Number(id.slice(separator + 1)),
		});
	};
	const sourceLabel = (upload: TransferUpload) => {
		const sameSite = checks()[uploads().indexOf(upload)]?.sameSite;
		const date = dateHelpers.formatDate(upload.file.exportedAt);
		if (sameSite) return T()("transfer.import.source.same", { date });

		let host = upload.file.source.url;
		try {
			host = new URL(upload.file.source.url).host;
		} catch {}
		return T()("transfer.import.source.other", { host, date });
	};
	const close = () => {
		if (running() || checking()) return;
		props.onOpenChange(false);
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.open) return;
		setUploads([]);
		setChecks([]);
		setItems([]);
		setMode("upsert");
		setCheckedMode("upsert");
		setPhase("choose");
		setErrors([]);
		resetInput();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={props.open}
			onOpenChange={close}
			dismissible={!running() && !checking()}
		>
			<input
				ref={inputRef}
				type="file"
				accept=".json,.zip,application/json,application/zip"
				multiple
				class="hidden"
				onChange={(event) => {
					void addFiles(Array.from(event.currentTarget.files ?? []));
					resetInput();
				}}
			/>
			<Modal.Body>
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<Modal.Title>
							{props.title ?? T()("transfer.import.title")}
						</Modal.Title>
						<Modal.Description class="mt-1">
							{props.description ?? T()("transfer.import.description")}
						</Modal.Description>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						shape="square"
						onClick={close}
						disabled={running() || checking()}
						aria-label={T()("common.close")}
					>
						<TbOutlineX size={14} />
					</Button>
				</div>
				<div class="mt-4 flex flex-col gap-4">
					<Show when={errors().length > 0}>
						<Alert variant="danger">
							<For each={errors()}>{(error) => <p>{error}</p>}</For>
						</Alert>
					</Show>
					<Show
						when={phase() !== "choose"}
						fallback={
							<ImportDropZone
								checking={checking()}
								onBrowse={() => inputRef?.click()}
								onFiles={(files) => void addFiles(files)}
							/>
						}
					>
						<ul class="flex flex-col gap-1.5">
							<For each={uploads()}>
								{(upload) => (
									<li class="flex min-w-0 items-center gap-2 text-xs text-body">
										<TbOutlineFileZip size={14} class="shrink-0 text-icon" />
										<span class="truncate">
											<span class="font-medium text-subtitle">
												{upload.name}
											</span>
											{" · "}
											{sourceLabel(upload)}
										</span>
									</li>
								)}
							</For>
						</ul>
						<Show when={showMode()}>
							<Select
								id="import-mode"
								name="importMode"
								label={T()("transfer.import.mode.label")}
								value={mode()}
								onChange={(value) => {
									if (value) changeMode(value);
								}}
								options={modeOptions()}
								//* the choice stays on screen once importing starts, so the list doesn't move
								disabled={checking() || phase() === "import"}
							/>
						</Show>
						<ul
							class={classNames(
								"divide-y divide-border overflow-hidden rounded-md border border-border bg-card transition-opacity",
								{ "pointer-events-none opacity-60": checking() },
							)}
							aria-busy={checking()}
						>
							<ImportMediaGroup
								items={mediaItems()}
								importing={phase() === "import"}
								finished={finished()}
								statusFor={statusFor}
								onRetry={(id) => void run([id])}
							/>
							<For each={entryItems()}>
								{(item) => (
									<ImportRow
										icon={item.resource === "media" ? "media" : "document"}
										label={item.planned.label}
										subtitle={subtitleFor(item)}
										status={statusFor(item)}
										busy={
											item.state === "uploading" || item.state === "importing"
										}
										progress={
											item.state === "uploading" ? item.progress : undefined
										}
										done={
											item.state === "done" && item.result?.status !== "failed"
										}
										failed={itemOutcome(item).status === "failed"}
										warnings={itemOutcome(item).warnings}
										errors={
											itemOutcome(item).error
												? [
														{
															message: itemOutcome(item).error?.message ?? "",
														},
													]
												: undefined
										}
										href={hrefFor(item)}
										onRetry={
											finished() &&
											item.valid &&
											itemOutcome(item).status === "failed"
												? () => void run([item.id])
												: undefined
										}
									/>
								)}
							</For>
						</ul>
					</Show>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<p class="text-sm text-subtitle">
					<Show
						when={phase() === "import"}
						fallback={
							<Show when={phase() === "review"}>
								{T()("transfer.import.summary.ready", {
									count: importable().length,
								})}
								<Show when={blockedCount() > 0}>
									{", "}
									{T()("transfer.import.summary.blocked", {
										count: blockedCount(),
									})}
								</Show>
							</Show>
						}
					>
						{T()("transfer.import.summary.done", {
							completed: succeededCount(),
							total: items().length,
							failed: failedItems().length,
						})}
					</Show>
				</p>
				<Modal.Actions class="flex-wrap">
					<Show
						when={phase() === "import"}
						fallback={
							<>
								<Button
									type="button"
									variant="outline"
									size="md"
									disabled={checking()}
									onClick={() =>
										phase() === "review" ? inputRef?.click() : close()
									}
								>
									{phase() === "review"
										? T()("transfer.import.choose.other")
										: T()("common.cancel")}
								</Button>
								<Show when={phase() === "review"}>
									<Button
										type="button"
										variant="primary"
										size="md"
										disabled={checking() || importable().length === 0}
										onClick={() =>
											void run(importable().map((item) => item.id))
										}
									>
										{T()("transfer.import.start", {
											count: importable().length,
										})}
									</Button>
								</Show>
							</>
						}
					>
						<Show when={finished() && retryableItems().length > 0}>
							<Button
								type="button"
								variant="outline"
								size="md"
								class="gap-2"
								onClick={() => void downloadFailed()}
							>
								<TbOutlineDownload size={14} />
								{T()("transfer.import.download.failed")}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="md"
								onClick={() =>
									void run(retryableItems().map((item) => item.id))
								}
							>
								{T()("transfer.import.retry.failed")}
							</Button>
						</Show>
						<Button
							type="button"
							variant="primary"
							size="md"
							loading={running()}
							disabled={running()}
							onClick={close}
						>
							{running()
								? T()("transfer.import.importing")
								: T()("common.done")}
						</Button>
					</Show>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default ImportModal;
