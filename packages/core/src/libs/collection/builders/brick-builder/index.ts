import deepMerge from "../../../../utils/helpers/deep-merge.js";
import { copy, normalizeCopy } from "../../../i18n/index.js";
import FieldBuilder from "../field-builder/index.js";
import type { BrickConfig, BrickOptions } from "./types.js";

/** A reusable group of fields for fixed, builder or embedded content. Register the brick on a collection. */
class BrickBuilder extends FieldBuilder {
	key: string;
	config: BrickConfig;
	constructor(key: string, config?: BrickOptions) {
		super();
		this.key = key;
		const options = deepMerge({}, config ?? {});
		this.config = {
			key: this.key,
			details: {
				label:
					normalizeCopy(options.details?.label) ||
					copy(`admin:bricks.${this.key}.name`, {
						defaultMessage: key,
					}),
				description: normalizeCopy(options.details?.description),
			},
			thumbnail: options.thumbnail,
		};
	}
	/** Returns a brick with independent config and field instances. */
	override clone(): BrickBuilder {
		return this.copyFieldsTo(new BrickBuilder(this.key, this.config));
	}
}

export default BrickBuilder;
