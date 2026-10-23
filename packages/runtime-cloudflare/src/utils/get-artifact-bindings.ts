import type { RuntimeArtifactCustom } from "@lucidcms/core/types";
import constants from "../constants.js";
import type {
	CloudflareBindingsArtifact,
	CloudflareBindingsOptions,
} from "../types.js";
import { mergeCloudflareBindings } from "./bindings.js";
import isRecord from "./is-record.js";

const isBindingsArtifact = (
	artifact: RuntimeArtifactCustom,
): artifact is CloudflareBindingsArtifact =>
	artifact.type === constants.BINDINGS_ARTIFACT_TYPE &&
	isRecord(artifact.custom);

/** Merges the bindings that adapters and plugins declare through prepare artifacts. */
const getArtifactBindings = (
	artifacts: RuntimeArtifactCustom[],
): CloudflareBindingsOptions | undefined =>
	mergeCloudflareBindings(
		...artifacts
			.filter(isBindingsArtifact)
			.map((artifact) => artifact.custom.bindings),
	);

export default getArtifactBindings;
