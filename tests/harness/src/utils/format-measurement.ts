import type { MeasurementUnit } from "../report/types.ts";
import formatDuration from "./format-duration.ts";

const formatBytes = (bytes: number): string => {
	if (bytes < 1024) {
		return `${Math.round(bytes)} B`;
	}
	if (bytes < 1024 ** 2) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	if (bytes < 1024 ** 3) {
		return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
	}
	return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

/** Formats a measured value with its unit for people, such as `3.2s` or `4.80 MB`. */
const formatMeasurement = (value: number, unit: MeasurementUnit): string => {
	switch (unit) {
		case "ms": {
			return formatDuration(value);
		}
		case "bytes": {
			return formatBytes(value);
		}
		case "count": {
			return String(Math.round(value));
		}
	}
};

export default formatMeasurement;
