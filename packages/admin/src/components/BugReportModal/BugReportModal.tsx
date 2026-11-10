import type { RichTextJSON } from "@lucidcms/richtext";
import { useLocation } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import DiagnosticsReportModal from "@/components/DiagnosticsReportModal/DiagnosticsReportModal";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import { richTextHasContent } from "@/components/RichText/helpers";
import RichText from "@/components/RichText/RichText";
import Select from "@/components/Select/Select";
import constants from "@/constants";
import { useDiagnostics } from "@/hooks/useDiagnostics/useDiagnostics";
import useFileDrop from "@/hooks/useFileDrop/useFileDrop";
import api from "@/services/api";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import BugReportAttachButton from "./parts/BugReportAttachButton";
import BugReportImages, { type BugReportImage } from "./parts/BugReportImages";

/** Sends a bug report to Lucid, with optional images and the diagnostics report. */
const BugReportModal: Component<{
	open: boolean;
	onOpenChange: (_open: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const [message, setMessage] = createSignal<RichTextJSON>();
	const [images, setImages] = createSignal<BugReportImage[]>([]);
	const [imageError, setImageError] = createSignal<string>();
	const [pendingBatches, setPendingBatches] = createSignal(0);
	const [includeDiagnostics, setIncludeDiagnostics] = createSignal<
		"include" | "exclude"
	>("include");
	const [reportOpen, setReportOpen] = createSignal(false);
	const diagnostics = useDiagnostics({ enabled: () => props.open });
	const submit = api.diagnostics.useSubmitBugReport({
		onSuccess: () => {
			setMessage(undefined);
			setImages([]);
			setIncludeDiagnostics("include");
			props.onOpenChange(false);
		},
	});
	const fileDrop = useFileDrop({
		enabled: () => !submit.action.isPending,
		onDrop: (files) => addImages(files),
	});
	let imageQueue = Promise.resolve();

	// ----------------------------------------
	// Memos
	const report = createMemo(() => diagnostics.report());
	const preparing = createMemo(() => pendingBatches() > 0);
	const sending = createMemo(() => submit.action.isPending);
	//* Allow previously loaded diagnostics while refreshing.
	const diagnosticsUnavailable = createMemo(
		() =>
			includeDiagnostics() === "include" &&
			report() === undefined &&
			diagnostics.error(),
	);
	const canSubmit = createMemo(
		() =>
			richTextHasContent(message()) &&
			!preparing() &&
			(includeDiagnostics() === "exclude" ||
				report() !== undefined ||
				diagnostics.error()),
	);

	// ----------------------------------------
	// Functions
	const prepareImages = async (files: File[]) => {
		setImageError(undefined);
		const room = constants.bugReports.maxImages - images().length;
		const imageFiles = files.filter((file) => file.type.startsWith("image/"));
		if (imageFiles.length < files.length) {
			setImageError(T()("bug.report.images.invalid"));
		}
		if (imageFiles.length > room) {
			setImageError(
				T()("bug.report.images.limit", {
					count: constants.bugReports.maxImages,
				}),
			);
		}

		for (const file of imageFiles.slice(0, Math.max(0, room))) {
			const prepared = await prepareAiImage(
				{ file },
				{ maxEdge: constants.bugReports.maxImageEdge, quality: 0.85 },
			).catch(() => undefined);
			if (!prepared) {
				setImageError(T()("bug.report.images.failed"));
				continue;
			}
			//* base64 holds three bytes in every four characters
			if ((prepared.data.length * 3) / 4 > constants.bugReports.maxImageBytes) {
				setImageError(T()("bug.report.images.too.large"));
				continue;
			}
			setImages((current) => [
				...current,
				{
					id: crypto.randomUUID(),
					mimeType: prepared.mimeType,
					data: prepared.data,
				},
			]);
		}
	};

	//* Serialize batches so attachment limits include earlier additions.
	const addImages = (files: File[]) => {
		setPendingBatches((count) => count + 1);
		imageQueue = imageQueue
			.then(() => prepareImages(files))
			.catch(() => {
				setImageError(T()("bug.report.images.failed"));
			})
			.finally(() => setPendingBatches((count) => count - 1));
	};

	const onPaste = (event: ClipboardEvent) => {
		const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
			file.type.startsWith("image/"),
		);
		if (files.length === 0 || sending()) return;
		event.preventDefault();
		addImages(files);
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		setImageError(undefined);
		submit.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={props.open}
			onOpenChange={props.onOpenChange}
			dismissible={!sending()}
		>
			<form
				ref={(form) => {
					//* Capture image pastes before the editor handles them.
					form.addEventListener("paste", onPaste, { capture: true });
					onCleanup(() =>
						form.removeEventListener("paste", onPaste, { capture: true }),
					);
				}}
				class="relative w-full"
				{...fileDrop.handlers}
				onSubmit={(event) => {
					event.preventDefault();
					const body = message();
					if (!body || !canSubmit()) return;
					submit.action.mutate({
						message: body,
						diagnostics:
							includeDiagnostics() === "include" ? (report() ?? null) : null,
						page: location.pathname,
						images: images().map((image) => image.data),
					});
				}}
			>
				<Show when={fileDrop.dragging()}>
					<div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-card/90 text-sm font-medium text-title">
						{T()("bug.report.drop")}
					</div>
				</Show>
				<Modal.Header>
					<Modal.Title>{T()("bug.report.title")}</Modal.Title>
					<Modal.Description>{T()("bug.report.description")}</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<div class="flex flex-col gap-4">
						<div class="flex flex-col gap-2">
							<RichText
								id="bug-report-message"
								name="bug-report-message"
								value={message()}
								onChange={setMessage}
								label={T()("bug.report.message")}
								placeholder={T()("bug.report.message.placeholder")}
								description={T()("bug.report.message.description")}
								headings={false}
								required
								disabled={sending()}
								toolbarEnd={
									<BugReportAttachButton
										disabled={
											sending() ||
											images().length >= constants.bugReports.maxImages
										}
										onAdd={addImages}
									/>
								}
							/>
							<BugReportImages
								images={images()}
								preparing={preparing()}
								disabled={sending()}
								error={imageError()}
								onRemove={(id) =>
									setImages((current) =>
										current.filter((image) => image.id !== id),
									)
								}
							/>
						</div>
						<div class="flex flex-col gap-2">
							<Select
								id="bug-report-diagnostics"
								name="bug-report-diagnostics"
								label={T()("bug.report.diagnostics")}
								labelEnd={
									<Show when={report() !== undefined}>
										<button
											type="button"
											class="rounded-sm text-xs text-muted transition-colors hover:text-title focus-ring"
											onClick={() => setReportOpen(true)}
										>
											{T()("bug.report.diagnostics.view")}
										</button>
									</Show>
								}
								value={includeDiagnostics()}
								onChange={(value) =>
									setIncludeDiagnostics(
										value === "exclude" ? "exclude" : "include",
									)
								}
								disabled={sending()}
								options={[
									{
										value: "include",
										label: T()("bug.report.diagnostics.include"),
										description: T()(
											"bug.report.diagnostics.include.description",
										),
									},
									{
										value: "exclude",
										label: T()("bug.report.diagnostics.exclude"),
										description: T()(
											"bug.report.diagnostics.exclude.description",
										),
									},
								]}
							/>
							<Show when={diagnosticsUnavailable()}>
								<p class="text-xs text-muted">
									{T()("bug.report.diagnostics.unavailable")}
								</p>
							</Show>
						</div>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={submit.errors()?.message} />
					<Modal.Actions>
						<Button
							variant="outline"
							disabled={sending()}
							onClick={() => props.onOpenChange(false)}
						>
							{T()("common.cancel")}
						</Button>
						<Button type="submit" disabled={!canSubmit()} loading={sending()}>
							{T()("bug.report.send")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
			<DiagnosticsReportModal
				open={reportOpen()}
				onOpenChange={setReportOpen}
				report={report() ?? ""}
			/>
		</Modal.Root>
	);
};

export default BugReportModal;
