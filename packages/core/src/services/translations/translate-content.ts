import z from "zod";
import type CollectionDefinition from "../../libs/collection/definitions/collection/index.js";
import type { ContentAccess } from "../../libs/collection/field-access/types.js";
import resolveCollectionLocalization from "../../libs/collection/helpers/resolve-collection-localization.js";
import type {
	ContentTranslateSegment,
	ContentTranslateV1Request,
} from "../../libs/lucid-remote/services/generate-cms-ai/type.js";
import { generateCmsAi } from "../../libs/lucid-remote/services/index.js";
import {
	cmsAiActor,
	isCmsAiGenerateCompletedData,
} from "../../libs/lucid-remote/utils.js";
import checkTranslatedText from "../../libs/translations/check-translated-text.js";
import hashTranslationText from "../../libs/translations/hash-translation-text.js";
import type { ContentInput } from "../../libs/translations/list-content-fields.js";
import selectTranslations, {
	type SelectedTranslation,
} from "../../libs/translations/select-translations.js";
import type { LucidErrorData } from "../../types/errors.js";
import type {
	TranslationChange,
	TranslationFailure,
	TranslationSettings,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import storeGeneration from "../ai/storage/store-generation.js";
import handleRemoteError from "../connection/helpers/handle-remote-error.js";
import getAccessToken from "../connection/token-manager.js";

/** Keeps each request well inside the limits Lucid AI accepts. */
const maxSegmentsPerCall = 80;
const maxCharactersPerCall = 40_000;
const maxSegmentCharacters = 20_000;
const maxLabelCharacters = 300;
const maxInstructionCharacters = 2_000;
const maxGlossaryTerms = 200;
const concurrentCalls = 4;

const outputSchema = z.object({ segments: z.record(z.string(), z.string()) });

const failureKeys = {
	missing: "server:core.translations.failure.missing",
	empty: "server:core.translations.failure.empty",
	markup: "server:core.translations.failure.markup",
} as const;

/**
 * Translates missing or stale machine values from the default locale. `overwrite` also replaces
 * human translations. Validates results and reports field failures. Callers enforce feature
 * access.
 */
const translateContent: ServiceFn<
	[
		{
			collection: CollectionDefinition;
			documents: Array<{ id: number; content: ContentInput }>;
			locales: string[];
			overwrite: boolean;
			note?: string;
			settings: TranslationSettings;
			/** What the person or agent may change. Fields they can't are skipped. */
			access: ContentAccess;
			userId: number | null;
			/** Groups this run's requests in AI usage. */
			sessionId: string;
		},
	],
	{
		changes: Array<TranslationChange & { documentId: number }>;
		failures: TranslationFailure[];
	}
> = async (context, data) => {
	const localization = resolveCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
	});
	if (!localization.enabled) {
		return { error: undefined, data: { changes: [], failures: [] } };
	}

	const pending = selectTranslations({
		collection: data.collection,
		localization,
		documents: data.documents,
		locales: data.locales,
		overwrite: data.overwrite,
		access: data.access,
	});
	const localeLabel = (code: string) =>
		context.config.localization.locales.find((locale) => locale.code === code)
			?.label ?? code;
	const sourceLocale = {
		code: localization.defaultLocale,
		label: localeLabel(localization.defaultLocale),
	};
	const collectionLabel =
		context.translate(data.collection.getData.details.labels.plural) ??
		data.collection.key;

	const changes: Array<TranslationChange & { documentId: number }> = [];
	const failures: TranslationFailure[] = [];
	const errors: LucidErrorData[] = [];

	const fieldLabel = (entry: SelectedTranslation) => {
		const details = entry.item.entry.owner.config.details;
		const brickLabel =
			entry.item.entry.brick !== null && "label" in details
				? context.translate(details.label)
				: undefined;
		const field = entry.item.entry.instance.config;
		return [brickLabel, context.translate(field.details.label) ?? field.key]
			.filter(Boolean)
			.join(" › ");
	};
	const fail = (entry: SelectedTranslation, message: string) => {
		failures.push({
			documentId: entry.documentId,
			locale: entry.locale,
			field: fieldLabel(entry),
			message,
		});
	};

	//* Lucid AI takes fields up to a length, so longer ones are reported instead of failing their batch
	const translatable = pending.filter((entry) => {
		if (entry.item.source.text.length <= maxSegmentCharacters) return true;
		fail(entry, context.translate("server:core.translations.failure.long"));
		return false;
	});
	if (translatable.length === 0) {
		return { error: undefined, data: { changes: [], failures } };
	}

	const tokenRes = await getAccessToken(context, {});
	if (tokenRes.error) return tokenRes;

	//* one call covers one document and locale, split when it has a lot of text
	const calls: SelectedTranslation[][] = [];
	for (const group of Map.groupBy(
		translatable,
		(entry) => `${entry.documentId}\n${entry.locale}`,
	).values()) {
		let call: SelectedTranslation[] = [];
		let characters = 0;
		for (const entry of group) {
			const length = entry.item.source.text.length;
			if (
				call.length > 0 &&
				(call.length >= maxSegmentsPerCall ||
					characters + length > maxCharactersPerCall)
			) {
				calls.push(call);
				call = [];
				characters = 0;
			}
			call.push(entry);
			characters += length;
		}
		if (call.length > 0) calls.push(call);
	}

	const runCall = async (call: SelectedTranslation[]) => {
		const first = call[0];
		if (!first) return;

		const segments: ContentTranslateSegment[] = call.map((entry, index) => {
			const config = entry.item.entry.instance.config;
			return {
				id: `s${index}`,
				format: entry.item.source.format,
				text: entry.item.source.text,
				label: fieldLabel(entry).slice(0, maxLabelCharacters),
				instructions:
					[
						"ai" in config ? config.ai?.instructions : undefined,
						context.translate(config.details.description),
					]
						.filter(Boolean)
						.join("\n")
						.slice(0, maxInstructionCharacters) || undefined,
			};
		});
		const text = segments
			.map((segment) => segment.text)
			.join("\n")
			.toLowerCase();
		const glossary = data.settings.glossary
			.filter(
				(term) =>
					(term.locale === null || term.locale === first.locale) &&
					text.includes(term.term.toLowerCase()),
			)
			.slice(0, maxGlossaryTerms)
			.map((term) => ({ term: term.term, translation: term.translation }));
		const style = data.settings.styles.find(
			(entry) => entry.locale === first.locale,
		)?.instructions;

		const request: ContentTranslateV1Request = {
			feature: { key: "content.translate", version: "v1" },
			sessionId: data.sessionId,
			input: data.note
				? [{ type: "text", role: "user-instruction", value: data.note }]
				: [],
			context: {
				locale: {
					source: sourceLocale,
					target: { code: first.locale, label: localeLabel(first.locale) },
				},
				document: { collection: collectionLabel },
				...(style ? { style } : {}),
				...(glossary.length > 0 ? { glossary } : {}),
				segments,
			},
		};

		const requestStartedAt = Date.now();
		const generateRes = await generateCmsAi(context, {
			accessToken: tokenRes.data.accessToken,
			actor: cmsAiActor(data.userId),
			request,
		});
		if (generateRes.error) {
			errors.push(generateRes.error);
			await handleRemoteError(context, generateRes.error);
			const message = context.translate(
				generateRes.error.message ??
					"server:core.routes.ai.generate.error.message",
			);
			for (const entry of call) fail(entry, message);
			return;
		}

		const response = generateRes.data.json.data;
		const output = isCmsAiGenerateCompletedData(response)
			? outputSchema.safeParse(response.output)
			: undefined;
		if (isCmsAiGenerateCompletedData(response)) {
			const storeRes = await storeGeneration(context, {
				lucidRemoteConnectionId: tokenRes.data.lucidRemoteConnectionId,
				userId: data.userId,
				session: { type: "translation", id: data.sessionId },
				response,
				requestStartedAt,
				...(output?.success
					? {}
					: {
							status: "failed" as const,
							errorMessage: context.translate(
								"server:core.routes.ai.generate.error.message",
							),
						}),
			});
			if (storeRes.error) errors.push(storeRes.error);
		}
		if (!output?.success) {
			const message = context.translate(
				"server:core.routes.ai.generate.error.message",
			);
			for (const entry of call) fail(entry, message);
			return;
		}

		for (const [index, entry] of call.entries()) {
			const translated = output.data.segments[`s${index}`];
			const problem =
				translated === undefined
					? "missing"
					: checkTranslatedText(entry.item.source, translated);
			if (translated === undefined || problem !== null) {
				fail(entry, context.translate(failureKeys[problem ?? "missing"]));
				continue;
			}

			const field = entry.item.entry;
			const value = field.instance.normalizeInputValue(
				entry.item.translation.write(translated, {
					source: field.field.translations?.[localization.defaultLocale],
					current: field.field.translations?.[entry.locale],
				}),
			);
			const valueText = entry.item.translation.read(value);
			//* without reference data, rich text skips its link checks, which saving runs
			const validation = field.instance.validate({
				type: field.instance.type,
				value,
			});
			if (!valueText || !validation.valid) {
				fail(
					entry,
					context.translate(
						validation.message ?? "server:core.translations.failure.invalid",
					),
				);
				continue;
			}

			changes.push({
				documentId: entry.documentId,
				brick: field.brick,
				path: field.path,
				locale: entry.locale,
				value: value as TranslationChange["value"],
				source: {
					source: entry.item.sourceHash,
					origin: "ai",
					output: hashTranslationText(valueText),
				},
			});
		}
	};

	let next = 0;
	await Promise.all(
		Array.from(
			{ length: Math.min(concurrentCalls, calls.length) },
			async () => {
				while (next < calls.length) {
					const call = calls[next++];
					if (call) await runCall(call);
				}
			},
		),
	);

	//* a run where nothing worked reports why, eg. no credits left
	const firstError = errors[0];
	if (changes.length === 0 && firstError) {
		return { error: firstError, data: undefined };
	}

	return { error: undefined, data: { changes, failures } };
};

export default translateContent;
