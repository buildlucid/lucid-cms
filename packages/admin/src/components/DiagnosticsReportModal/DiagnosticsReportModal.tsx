import {
	TbOutlineCheck,
	TbOutlineCopy,
	TbOutlineDownload,
} from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { createCopy } from "@/components/Copy/copyValue";
import Modal from "@/components/Modal/Modal";
import T from "@/translations";
import downloadFile from "@/utils/download-file";

interface DiagnosticsReportModalProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** The Markdown report from `useDiagnostics`. */
	report: string;
}

/** Previews the diagnostics report, so people can check what they share, with buttons to copy or download it. */
const DiagnosticsReportModal: Component<DiagnosticsReportModalProps> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const [copied, copy] = createCopy(() => props.report);

	// ----------------------------------------
	// Functions
	const download = () => {
		const date = new Date().toISOString().slice(0, 10);
		downloadFile(
			new Blob([props.report], { type: "text/markdown" }),
			`${window.location.host}-diagnostics-${date}.md`,
		);
	};

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.open} onOpenChange={props.onOpenChange} size="lg">
			<Modal.Header>
				<Modal.Title>{T()("diagnostics.report.title")}</Modal.Title>
				<Modal.Description>
					{T()("diagnostics.report.description")}
				</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<pre class="scrollbar overflow-x-auto rounded-md border border-border bg-input p-4 font-mono text-xs leading-relaxed text-body whitespace-pre-wrap wrap-anywhere">
					{props.report}
				</pre>
			</Modal.Body>
			<Modal.Footer>
				<Modal.Actions>
					<Button type="button" variant="outline" size="sm" onClick={download}>
						<TbOutlineDownload class="mr-2 size-4" />
						{T()("common.download")}
					</Button>
					<Button
						type="button"
						variant="primary"
						size="sm"
						onClick={() => void copy()}
					>
						<Show
							when={copied()}
							fallback={<TbOutlineCopy class="mr-2 size-4" />}
						>
							<TbOutlineCheck class="mr-2 size-4" />
						</Show>
						{T()("common.copy")}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default DiagnosticsReportModal;
