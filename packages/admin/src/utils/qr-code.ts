import LogoIcon from "@assets/svgs/logo-icon-light.svg?raw";
import { encode } from "uqr";

/** Fraction of the code's width kept clear for the logo. */
const logoShare = 0.22;

/** Quiet zone, in modules, around exported images so they scan on any background. */
const exportBorder = 4;

const exportWidth = 1024;

/**
 * Builds a black-on-white SVG QR code with the Lucid logo. High error correction accommodates the
 * logo; black on white supports readers that reject inverted codes.
 */
export const createQRCodeSVG = (
	value: string,
	options?: {
		/** White margin around the code, in modules. @default 0 */
		border?: number;
		/** Target size, rounded up to whole pixels per module for sharp edges. */
		pixels?: number;
	},
) => {
	const qr = encode(value, { border: 0, ecc: "H" });
	const border = options?.border ?? 0;
	const width = qr.size + border * 2;
	//* an odd width, so the clear square sits exactly in the middle of the odd-sized code
	const logoWidth = Math.floor(qr.size * logoShare) | 1;
	const logoStart = (qr.size - logoWidth) / 2;
	const inLogo = (index: number) =>
		index >= logoStart && index < logoStart + logoWidth;

	const path = qr.data
		.flatMap((row, y) =>
			row.flatMap((dark, x) =>
				dark && !(inLogo(x) && inLogo(y))
					? [`M${x + border} ${y + border}h1v1h-1z`]
					: [],
			),
		)
		.join("");
	//* a module of space on each side keeps the logo apart from the code
	const logo = LogoIcon.replace(/<title>.*?<\/title>/, "").replace(
		"<svg",
		`<svg x="${logoStart + border + 1}" y="${logoStart + border + 1}" width="${logoWidth - 2}" height="${logoWidth - 2}"`,
	);
	const pixels = options?.pixels
		? width * Math.ceil(options.pixels / width)
		: undefined;
	const size = pixels ? ` width="${pixels}" height="${pixels}"` : "";

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${width}"${size}><rect width="${width}" height="${width}" fill="#fff"/><path d="${path}" fill="#000" shape-rendering="crispEdges"/>${logo}</svg>`;
};

/** Renders a QR code as a PNG of about 1024px with a quiet zone, for copying or downloading. */
export const createQRCodePNG = async (value: string) => {
	const image = new Image();
	image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
		createQRCodeSVG(value, { border: exportBorder, pixels: exportWidth }),
	)}`;
	await image.decode();

	const canvas = document.createElement("canvas");
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;
	canvas.getContext("2d")?.drawImage(image, 0, 0);

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error("Could not render the QR code"));
		}, "image/png");
	});
};
