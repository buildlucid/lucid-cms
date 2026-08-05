import type { ImageProcessorOptions } from "@lucidcms/core/types";

type FocalPoint = NonNullable<ImageProcessorOptions["focalPoint"]>;

/** Rotates normalized focal coordinates with their source image. */
export const rotateFocalPoint = (
	focalPoint: FocalPoint,
	rotate: ImageProcessorOptions["rotate"] = 0,
): FocalPoint => {
	switch (rotate) {
		case 90:
			return { x: 1 - focalPoint.y, y: focalPoint.x };
		case 180:
			return { x: 1 - focalPoint.x, y: 1 - focalPoint.y };
		case 270:
			return { x: focalPoint.y, y: 1 - focalPoint.x };
		default:
			return focalPoint;
	}
};

const rotatedDimensions = (props: {
	width: number;
	height: number;
	rotate: ImageProcessorOptions["rotate"];
}) =>
	props.rotate === 90 || props.rotate === 270
		? { width: props.height, height: props.width }
		: { width: props.width, height: props.height };

/**
 * Maps Lucid's resize semantics to the closest Cloudflare Images transform.
 * The outside fit is represented by resizing only its controlling axis.
 */
export const buildResizeTransform = (props: {
	options: ImageProcessorOptions;
	sourceWidth: number;
	sourceHeight: number;
}): ImageTransform | undefined => {
	const { options } = props;
	if (options.width === undefined && options.height === undefined) {
		return undefined;
	}

	const transform: ImageTransform = {
		...(options.width !== undefined ? { width: options.width } : {}),
		...(options.height !== undefined ? { height: options.height } : {}),
	};
	const fit = options.fit ?? "cover";

	switch (fit) {
		case "contain":
			transform.fit = "pad";
			transform.background = "#000000";
			break;
		case "fill":
			transform.fit = "squeeze";
			break;
		case "inside":
			transform.fit = "contain";
			break;
		case "outside": {
			transform.fit = "contain";
			const source = rotatedDimensions({
				width: props.sourceWidth,
				height: props.sourceHeight,
				rotate: options.rotate,
			});
			if (
				options.width !== undefined &&
				options.height !== undefined &&
				options.width > 0 &&
				options.height > 0
			) {
				const widthScale = options.width / source.width;
				const heightScale = options.height / source.height;
				if (widthScale >= heightScale) {
					delete transform.height;
				} else {
					delete transform.width;
				}
			}
			break;
		}
		default:
			transform.fit = "cover";
			if (options.focalPoint) {
				const focalPoint = rotateFocalPoint(options.focalPoint, options.rotate);
				transform.gravity = {
					x: focalPoint.x,
					y: focalPoint.y,
					mode: "box-center",
				};
			}
			break;
	}

	return transform;
};
