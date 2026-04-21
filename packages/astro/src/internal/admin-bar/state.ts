import astroConstants from "../../constants.js";
import type { LucidAstroAdminBarContext } from "../../types.js";
import {
	buildLucidAdminBarEditHref,
	resolveLucidAdminBarEditLabel,
} from "./shared.js";

export type LucidAdminBarState = {
	dashboardHref: string;
	editHref: string | null;
	editLabel: string | null;
};

const stateScriptMarker = 'data-lucid-admin-bar-state="true"';

const escapeInlineJson = (value: string): string =>
	value
		.replaceAll("<", "\\u003c")
		.replaceAll("\u2028", "\\u2028")
		.replaceAll("\u2029", "\\u2029");

/**
 * Creates the small state payload the Lucid dev toolbar app reads on the
 * client.
 */
export const buildLucidAdminBarState = (props: {
	context: LucidAstroAdminBarContext | null;
}): LucidAdminBarState => {
	const editHref = buildLucidAdminBarEditHref(props.context?.edit);

	return {
		dashboardHref: astroConstants.paths.mountPath,
		editHref,
		editLabel: editHref
			? resolveLucidAdminBarEditLabel(props.context?.edit)
			: null,
	};
};

/**
 * Injects a single inline state script for the dev toolbar app and avoids
 * duplicate injections when HTML is transformed more than once.
 */
export const injectLucidAdminBarStateIntoHtml = (
	html: string,
	state: LucidAdminBarState,
): string => {
	if (html.includes(stateScriptMarker)) {
		return html;
	}

	const serializedState = escapeInlineJson(JSON.stringify(state));
	const script = `<script ${stateScriptMarker}>window[${JSON.stringify(astroConstants.integration.adminBarStateGlobalKey)}]=${serializedState};window.dispatchEvent(new CustomEvent(${JSON.stringify(astroConstants.integration.adminBarStateEvent)}, { detail: window[${JSON.stringify(astroConstants.integration.adminBarStateGlobalKey)}] }));</script>`;

	return html.includes("</body>")
		? html.replace("</body>", `${script}</body>`)
		: `${html}${script}`;
};
