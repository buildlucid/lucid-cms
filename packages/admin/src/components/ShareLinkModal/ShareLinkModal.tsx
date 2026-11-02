import {
	TbOutlineCheck,
	TbOutlineDownload,
	TbOutlinePhoto,
	TbOutlineShare,
} from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import Button from "@/components/Button/Button";
import Copy from "@/components/Copy/Copy";
import { createCopy } from "@/components/Copy/copyValue";
import Modal from "@/components/Modal/Modal";
import QRCode from "@/components/QRCode/QRCode";
import T from "@/translations";
import downloadFile from "@/utils/download-file";
import { createQRCodePNG } from "@/utils/qr-code";
import spawnToast from "@/utils/spawn-toast";

const canCopyImage = typeof ClipboardItem !== "undefined";

const canShare = typeof navigator.share === "function";

interface ShareLinkModalProps {
	/** Undefined while the link loads. */
	url: string | undefined;
	/** Names downloaded QR code images. */
	token: string | undefined;
	/** Title for the browser's share sheet. */
	title?: string;
	/** Shows a button that opens the browser's share sheet, where supported. */
	share?: boolean;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

/**
 * Shows the link and QR code with copy and download actions. `share` enables the browser share
 * sheet.
 */
const ShareLinkModal: Component<ShareLinkModalProps> = (props) => {
	// ------------------------------
	// State & Hooks
	const [imageCopied, copyImage] = createCopy(() =>
		createQRCodePNG(props.url ?? ""),
	);

	// ------------------------------
	// Functions
	const downloadImage = async () => {
		if (!props.url) return;

		try {
			downloadFile(
				await createQRCodePNG(props.url),
				`share-link-${props.token}.png`,
			);
		} catch {
			spawnToast({
				title: T()("toasts.common.qr.code.download.error"),
				status: "error",
			});
		}
	};
	const share = async () => {
		if (!props.url) return;

		try {
			await navigator.share({ title: props.title, url: props.url });
		} catch (error) {
			//* closing the share sheet rejects with an AbortError
			if (error instanceof DOMException && error.name === "AbortError") return;
			spawnToast({
				title: T()("toasts.common.share.error"),
				status: "error",
			});
		}
	};

	// ------------------------------
	// Render
	return (
		<Modal.Root
			role="alertdialog"
			open={props.state.open}
			onOpenChange={props.state.setOpen}
		>
			<Modal.Header>
				<Modal.Title>
					{T()("modals.common.copy.share.link.url.title")}
				</Modal.Title>
				<Modal.Description>
					{T()("modals.common.copy.share.link.url.description")}
				</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<div class="flex flex-col items-center gap-6 rounded-lg border border-border bg-input p-4 pt-6">
					<div class="size-44">
						<Show
							when={props.url}
							fallback={<span class="skeleton block size-full rounded-md" />}
						>
							{(url) => (
								<QRCode
									value={url()}
									label={T()("modals.common.copy.share.link.url.qr.label")}
								/>
							)}
						</Show>
					</div>
					{/* pulled towards the panel's edges so the buttons read as part of it */}
					<div class="-mx-2.5 -mb-2.5 flex gap-2 self-stretch [&>button]:flex-1">
						<Show when={canCopyImage}>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!props.url}
								onClick={() => void copyImage()}
							>
								<Show
									when={imageCopied()}
									fallback={<TbOutlinePhoto class="mr-2 size-4" />}
								>
									<TbOutlineCheck class="mr-2 size-4" />
								</Show>
								{T()("common.copy.image")}
							</Button>
						</Show>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!props.url}
							onClick={() => void downloadImage()}
						>
							<TbOutlineDownload class="mr-2 size-4" />
							{T()("common.download")}
						</Button>
					</div>
				</div>
				<Copy.Input class="mt-3" value={props.url ?? ""} />
				<Show when={props.share && canShare}>
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="mt-3 w-full"
						disabled={!props.url}
						onClick={() => void share()}
					>
						<TbOutlineShare class="mr-2 size-4" />
						{T()("common.share.via")}
					</Button>
				</Show>
			</Modal.Body>
		</Modal.Root>
	);
};

export default ShareLinkModal;
