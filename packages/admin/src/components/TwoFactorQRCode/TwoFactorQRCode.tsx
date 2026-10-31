import LogoIcon from "@assets/svgs/logo-icon-light.svg?url";
import { type Component, createMemo } from "solid-js";
import { encode } from "uqr";
import T from "@/translations";

interface TwoFactorQRCodeProps {
	/** The otpauth:// link for authenticator apps. */
	uri: string;
}

/** Fraction of QR width reserved for the logo. */
const logoShare = 0.22;

/**
 * Generates the QR code locally to keep the secret private. Black on white supports apps that reject
 * inverted codes.
 */
const TwoFactorQRCode: Component<TwoFactorQRCodeProps> = (props) => {
	// ----------------------------------------
	// Memos
	const qr = createMemo(() => encode(props.uri, { border: 0, ecc: "H" }));
	//* an odd width, so the clear square sits exactly in the middle of the odd-sized code
	const logoArea = createMemo(() => {
		const width = Math.floor(qr().size * logoShare) | 1;
		return { start: (qr().size - width) / 2, width };
	});
	const path = createMemo(() => {
		const { start, width } = logoArea();
		const inLogo = (index: number) => index >= start && index < start + width;

		return qr()
			.data.flatMap((row, y) =>
				row.flatMap((dark, x) =>
					dark && !(inLogo(x) && inLogo(y)) ? [`M${x} ${y}h1v1h-1z`] : [],
				),
			)
			.join("");
	});

	// ----------------------------------------
	// Render
	return (
		<div class="rounded-md bg-white p-2.5 shadow-xs ring-1 ring-black/5">
			<svg
				viewBox={`0 0 ${qr().size} ${qr().size}`}
				class="block size-full"
				shape-rendering="crispEdges"
				role="img"
				aria-label={T()("auth.two.factor.qr.label")}
			>
				<path d={path()} fill="#000" />
				{/* a module of space on each side keeps the logo apart from the code */}
				<image
					href={LogoIcon}
					x={logoArea().start + 1}
					y={logoArea().start + 1}
					width={logoArea().width - 2}
					height={logoArea().width - 2}
					aria-hidden="true"
				/>
			</svg>
		</div>
	);
};

export default TwoFactorQRCode;
