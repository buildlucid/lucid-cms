import type { SiteState } from "../types.js";

/** Kiln render options for a site render: its state, with its locale for `Intl` filters, fragment cache keys and the `locale` global. */
const renderOptions = (state: SiteState) => ({
	state,
	locale: state.locale,
	globals: { locale: state.locale },
});

export default renderOptions;
