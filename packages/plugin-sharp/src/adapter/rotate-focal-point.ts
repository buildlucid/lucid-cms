import type { MediaTransformationOptions } from "@lucidcms/core/types";

type FocalPoint = NonNullable<MediaTransformationOptions["focalPoint"]>;

/** Keeps a focal point attached to the same content after clockwise rotation. */
const rotateFocalPoint = (
	focalPoint: FocalPoint,
	rotate: MediaTransformationOptions["rotate"] = 0,
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

export default rotateFocalPoint;
