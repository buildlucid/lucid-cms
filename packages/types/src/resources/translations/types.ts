import type {
	DocumentFieldValueResponse,
	TranslationSource,
} from "../documents/types.js";

/** How one document's translation into a locale compares with its default locale. */
export type TranslationStatus = {
	locale: string;
	/** Translated fields with text in the default locale. */
	fields: number;
	/** Fields with source text and no translation. */
	missing: number;
	/** Translations by the translation feature made from older source text. Translating again refreshes them. */
	outdated: number;
	/** Translations by a person, which translating leaves alone unless it overwrites. */
	byPerson: number;
	/** Translations by a person made from older source text, which need a person to check them. Part of `byPerson`. */
	byPersonOutdated: number;
	/** Words of source text a translation sends: leaving people's translations alone, or overwriting them. */
	words: { update: number; overwrite: number };
};

/** A document's translation status for each locale other than its default. */
export type DocumentTranslationStatus = {
	collectionKey: string;
	documentId: number;
	/** The locale translations are made from. */
	sourceLocale: string;
	locales: TranslationStatus[];
};

/** A translated value for the open editor to fill in. */
export type TranslationChange = {
	/** The brick's ref, or null for the document's own fields. */
	brick: string | null;
	/** Field keys and repeater item refs from the brick down to the field, eg. `["items", "<item ref>", "title"]`. */
	path: string[];
	locale: string;
	value: DocumentFieldValueResponse;
	source: TranslationSource;
};

/** A field, or a whole document, that could not be translated. Its translation is left as it was. */
export type TranslationFailure = {
	documentId: number;
	locale: string;
	/** The field's labels from its brick down, eg. `Hero › Heading`. Null when the document's request for the locale couldn't be opened. */
	field: string | null;
	message: string;
};

/** The result of translating documents into requests, straight into latest, or into the open editor. */
export type TranslateDocumentsResponse =
	| {
			delivery: "request";
			/** The requests holding the translations, by locale: one opened per locale, or the existing request they went into. Empty while queued. */
			requests: Array<{ id: number; locale: string; documents: number }>;
			/** Whether the translation runs in the background and opens its requests when done. */
			queued: boolean;
			failures: TranslationFailure[];
	  }
	| {
			delivery: "latest";
			/** The documents whose latest content was saved with translations, without review. */
			documents: number[];
			failures: TranslationFailure[];
	  }
	| {
			delivery: "editor";
			changes: TranslationChange[];
			failures: TranslationFailure[];
	  };

/** A glossary term the translation feature keeps or always translates the same way. */
export type TranslationGlossaryTerm = {
	id: number;
	term: string;
	/** The target locale the term applies to. Null for every locale. */
	locale: string | null;
	/** The translation to use. Null keeps the term exactly as written. */
	translation: string | null;
};

/** Notes on tone and style for translations into a locale. */
export type TranslationLocaleStyle = {
	locale: string;
	instructions: string;
};

/** Glossary and style notes that every translation follows. */
export type TranslationSettings = {
	glossary: TranslationGlossaryTerm[];
	styles: TranslationLocaleStyle[];
};
