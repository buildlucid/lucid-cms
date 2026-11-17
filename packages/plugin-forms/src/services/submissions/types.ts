/** Why a field's answer or files were refused, keyed by field name in a failed submission's `errors.values`. */
export type FieldErrors = Record<
	string,
	{
		/**
		 * Why it was refused: `required`, then for answers `too_long`, `too_short`, `too_large`,
		 * `too_small`, `too_many`, `too_few`, `format`, `not_an_option`, `step` or `invalid`, and
		 * for files `too_many`, `file_empty`, `file_type` or `file_size`.
		 */
		code: string;
		message: string;
	}
>;
