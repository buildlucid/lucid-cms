import type { TranslationGlossaryTerm } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	untrack,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import Select from "@/components/Select/Select";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import { getLocaleName } from "@/utils/locale-name";

/** The language option meaning a term applies to every language. */
const allLocales = "*";

/** Adds a glossary term, or edits the one given. */
const GlossaryTermModal: Component<{
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** The term to edit. Left out to add one. */
	term?: TranslationGlossaryTerm;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [term, setTerm] = createSignal("");
	const [locale, setLocale] = createSignal(allLocales);
	const [translation, setTranslation] = createSignal("");

	// ----------------------------------------
	// Mutations
	const create = api.translations.useCreateGlossaryTerm({
		onSuccess: () => props.onOpenChange(false),
	});
	const update = api.translations.useUpdateGlossaryTerm({
		onSuccess: () => props.onOpenChange(false),
	});

	// ----------------------------------------
	// Memos
	const mutation = createMemo(() => (props.term ? update : create));
	const localeOptions = createMemo(() => [
		{ value: allLocales, label: T()("translations.glossary.locale.all") },
		...contentLocaleStore.get.locales.map((item) => ({
			value: item.code,
			label: getLocaleName(item.code, { withCode: true }),
		})),
	]);

	// ----------------------------------------
	// Functions
	const save = () => {
		const body = {
			term: term().trim(),
			locale: locale() === allLocales ? null : locale(),
			translation: translation().trim() || null,
		};
		if (props.term) update.action.mutate({ id: props.term.id, body });
		else create.action.mutate({ body });
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		const current = untrack(() => props.term);
		setTerm(current?.term ?? "");
		setLocale(current?.locale ?? allLocales);
		setTranslation(current?.translation ?? "");
		create.reset();
		update.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.open} onOpenChange={props.onOpenChange}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					save();
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{props.term
							? T()("translations.glossary.modal.edit")
							: T()("translations.glossary.modal.add")}
					</Modal.Title>
					<Modal.Description>
						{T()("translations.glossary.modal.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<div class="flex flex-col gap-4">
						<Input
							id="glossary-term"
							name="term"
							type="text"
							value={term()}
							onChange={setTerm}
							required={true}
							label={T()("translations.glossary.term")}
							errors={getBodyError("term", mutation().errors)}
						/>
						<Select
							id="glossary-locale"
							name="locale"
							value={locale()}
							onChange={(value) =>
								setLocale(value === undefined ? allLocales : String(value))
							}
							options={localeOptions()}
							label={T()("translations.glossary.locale")}
							errors={getBodyError("locale", mutation().errors)}
						/>
						<Input
							id="glossary-translation"
							name="translation"
							type="text"
							value={translation()}
							onChange={setTranslation}
							label={T()("translations.glossary.translation")}
							placeholder={T()("translations.glossary.kept")}
							errors={getBodyError("translation", mutation().errors)}
						/>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={mutation().errors()?.message} />
					<Modal.Actions>
						<Button variant="outline" onClick={() => props.onOpenChange(false)}>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							loading={mutation().action.isPending}
							disabled={!term().trim()}
						>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default GlossaryTermModal;
