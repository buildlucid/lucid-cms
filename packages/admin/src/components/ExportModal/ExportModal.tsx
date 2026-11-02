import classNames from "classnames";
import {
	TbOutlineFileText,
	TbOutlineLink,
	TbOutlinePhoto,
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
import Modal from "@/components/Modal/Modal";
import Select, { type SelectOption } from "@/components/Select/Select";
import Spinner from "@/components/Spinner/Spinner";
import api from "@/services/api";
import T from "@/translations";
import downloadFile from "@/utils/download-file";
import helpers from "@/utils/helpers";
import spawnToast from "@/utils/spawn-toast";
import { createTransferDownload } from "@/utils/transfer-archive";
import { SummaryRow } from "./parts/SummaryRow";

export interface ExportModalProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** What to export, by resource, eg. `{ documents: [{ collectionKey: "pages", ids: [1] }] }`. Nothing loads while it's undefined. */
	select: Record<string, unknown> | undefined;
	title: string;
	/** Defaults to describing a document export. */
	description?: string;
	/** Start of the downloaded file's name, eg. the collection's name. */
	fileName: string;
	/** Notes that changes the editor hasn't saved yet aren't included. */
	unsaved?: boolean;
	/** Called once the file has downloaded. */
	onSuccess?: () => void;
}

const toFileName = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "export";

/**
 * Confirms an export and downloads it. Media files are bundled in a zip by default, and
 * documents the selection links to can be added before downloading.
 *
 * @example
 * ```tsx
 * import { ExportModal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<ExportModal
 * 		open={open()}
 * 		onOpenChange={setOpen}
 * 		select={{ "@acme/lucid-bookings": selectedIds() }}
 * 		title="Export Bookings"
 * 		fileName="bookings"
 * 	/>
 * );
 * ```
 */
const ExportModal: Component<ExportModalProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [files, setFiles] = createSignal<"include" | "link">("include");
	const [linked, setLinked] = createSignal<"leave" | "include">("leave");
	//* counted from the export without linked documents, so the option stays put when they're added
	const [linkedCount, setLinkedCount] = createSignal(0);
	const [progress, setProgress] = createSignal<{
		done: number;
		total: number;
	}>();
	const [exporting, setExporting] = createSignal(false);
	const [error, setError] = createSignal<string>();

	// ----------------------------------------
	// Queries & Mutations
	const exportQuery = api.transfer.useExport({
		queryParams: {
			select: () => props.select,
			linked: () => linked() === "include",
		},
		enabled: () => props.open,
	});

	// ----------------------------------------
	// Memos
	const file = createMemo(() => exportQuery.data?.data);
	const documents = createMemo(() => file()?.resources.documents ?? []);
	const media = createMemo(() => file()?.resources.media ?? []);
	const mediaSize = createMemo(() =>
		media().reduce((total, entry) => total + entry.size, 0),
	);
	const privateCount = createMemo(
		() => media().filter((entry) => !entry.public).length,
	);
	const bundled = createMemo(() => files() === "include" && media().length > 0);
	const fileOptions = createMemo(
		(): Array<SelectOption & { value: "include" | "link" }> => [
			{
				value: "include",
				label: T()("transfer.export.files.include"),
				description: T()("transfer.export.files.include.description"),
			},
			{
				value: "link",
				label: T()("transfer.export.files.link"),
				description: T()("transfer.export.files.link.description"),
			},
		],
	);
	const linkedOptions = createMemo(
		(): Array<SelectOption & { value: "leave" | "include" }> => [
			{
				value: "leave",
				label: T()("transfer.export.linked.leave"),
				description: T()("transfer.export.linked.leave.description"),
			},
			{
				value: "include",
				label: T()("transfer.export.linked.include", { count: linkedCount() }),
				description: T()("transfer.export.linked.include.description"),
			},
		],
	);

	// ----------------------------------------
	// Functions
	const close = () => {
		if (exporting()) return;
		props.onOpenChange(false);
	};
	const download = async () => {
		const data = file();
		if (!data) return;

		setExporting(true);
		setError(undefined);
		const name = `${toFileName(props.fileName)}-${new Date().toISOString().slice(0, 10)}`;
		try {
			const download = await createTransferDownload(data, {
				bundle: bundled(),
				fetch: true,
				onProgress: (done, total) => setProgress({ done, total }),
			});
			downloadFile(download.blob, `${name}.${download.extension}`);
			if (download.missing > 0) {
				spawnToast({
					title: T()("toasts.transfer.export.title"),
					message: T()("toasts.transfer.export.missing", {
						count: download.missing,
					}),
					status: "warning",
				});
			}

			props.onOpenChange(false);
			props.onSuccess?.();
		} catch (exportError) {
			setError(
				exportError instanceof Error
					? exportError.message
					: T()("errors.unknown.message"),
			);
		} finally {
			setExporting(false);
			setProgress(undefined);
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!file() || linked() === "include" || exportQuery.isPlaceholderData) {
			return;
		}

		const included = new Set(documents().map((entry) => entry.uid));
		const links = new Set(
			documents().flatMap((entry) =>
				Object.values(entry.refs?.documents ?? {}).filter(
					(uid) => !included.has(uid),
				),
			),
		);
		setLinkedCount(links.size);
	});
	createEffect(() => {
		if (props.open) return;
		setFiles("include");
		setLinked("leave");
		setLinkedCount(0);
		setError(undefined);
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.open}
			onOpenChange={props.onOpenChange}
			title={props.title}
			description={props.description ?? T()("transfer.export.description")}
			confirmLabel={T()("common.export")}
			confirmVariant="primary"
			loading={exporting()}
			confirmDisabled={!file() || exportQuery.isFetching}
			error={error() ?? exportQuery.error?.message}
			onConfirm={() => void download()}
			onCancel={close}
			footerStart={
				<Show when={progress()}>
					{(value) => (
						<p class="text-sm text-body">
							{T()("transfer.export.progress", {
								done: value().done,
								total: value().total,
							})}
						</p>
					)}
				</Show>
			}
		>
			<div class="flex flex-col gap-4">
				<Show when={props.unsaved}>
					<Alert variant="warning">{T()("transfer.export.unsaved")}</Alert>
				</Show>
				<div class="relative">
					<ul
						class={classNames(
							"divide-y divide-border rounded-md border border-border bg-card transition-opacity",
							{ "opacity-60": exportQuery.isFetching && file() },
						)}
						aria-busy={exportQuery.isFetching}
					>
						<Show
							when={file()}
							fallback={
								<For each={[0, 1]}>
									{() => (
										<li class="flex items-center gap-3 px-4 py-3">
											<span class="skeleton size-7 shrink-0 rounded-md" />
											<span class="skeleton h-4 w-32" />
										</li>
									)}
								</For>
							}
						>
							<Show when={documents().length > 0}>
								<SummaryRow
									icon={<TbOutlineFileText size={14} />}
									label={T()("transfer.export.summary.documents", {
										//* linked documents have their own row, so this counts the selection
										count:
											documents().length -
											(linked() === "include" ? linkedCount() : 0),
									})}
								/>
							</Show>
							<Show when={media().length > 0 || documents().length === 0}>
								<SummaryRow
									icon={<TbOutlinePhoto size={14} />}
									label={T()("transfer.export.summary.media", {
										count: media().length,
									})}
									detail={
										media().length > 0
											? helpers.bytesToSize(mediaSize())
											: undefined
									}
								/>
							</Show>
							<Show when={linkedCount() > 0}>
								<SummaryRow
									icon={<TbOutlineLink size={14} />}
									label={T()("transfer.export.summary.linked", {
										count: linkedCount(),
									})}
									detail={
										linked() === "include"
											? T()("transfer.export.summary.linked.included")
											: T()("transfer.export.summary.linked.left.out")
									}
								/>
							</Show>
						</Show>
					</ul>
					<Show when={exportQuery.isFetching && file()}>
						<span class="absolute top-3 right-3">
							<Spinner size="xs" />
						</span>
					</Show>
				</div>
				<Show when={media().length > 0 || linkedCount() > 0}>
					<div
						class={classNames("grid gap-4", {
							"md:grid-cols-2": media().length > 0 && linkedCount() > 0,
						})}
					>
						<Show when={media().length > 0}>
							<Select
								id="export-files"
								name="exportFiles"
								label={T()("transfer.export.files.label")}
								value={files()}
								onChange={(value) => {
									if (value) setFiles(value);
								}}
								options={fileOptions()}
								disabled={exporting()}
							/>
						</Show>
						<Show when={linkedCount() > 0}>
							<Select
								id="export-linked"
								name="exportLinked"
								label={T()("transfer.export.linked.label")}
								value={linked()}
								onChange={(value) => {
									if (value) setLinked(value);
								}}
								options={linkedOptions()}
								disabled={exporting()}
							/>
						</Show>
					</div>
				</Show>
				<Show when={files() === "link" && privateCount() > 0}>
					<Alert variant="warning">
						{T()("transfer.export.files.private", {
							count: privateCount(),
						})}
					</Alert>
				</Show>
			</div>
		</Modal.Confirm>
	);
};

export default ExportModal;
