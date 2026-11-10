import { type Component, createMemo } from "solid-js";
import { createQRCodeSVG } from "@/utils/qr-code";

interface QRCodeProps {
	value: string;
	/** Accessible description of what the code links to. */
	label: string;
}

/** A QR code with the Lucid logo, generated locally so secrets in the value stay private. */
const QRCode: Component<QRCodeProps> = (props) => {
	// ----------------------------------------
	// Memos
	const svg = createMemo(() => createQRCodeSVG(props.value));

	// ----------------------------------------
	// Render
	return (
		<div
			role="img"
			aria-label={props.label}
			class="size-full rounded-md bg-white p-2.5 shadow-raised ring-1 ring-black/5 [&>svg]:block [&>svg]:size-full"
			innerHTML={svg()}
		/>
	);
};

export default QRCode;
