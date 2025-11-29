import T from "@/translations";
import { type Accessor, type Component, For, Match, Switch } from "solid-js";
import classNames from "classnames";
import { FaSolidXmark, FaSolidPen } from "solid-icons/fa";
import type {
	ErrorResult,
	FieldError,
	DocumentResponse,
	DocumentRef,
} from "@types";
import documentSelectStore from "@/store/forms/documentSelectStore";
import Button from "@/components/Partials/Button";
import helpers from "@/utils/brick-helpers";
import { Label, DescribedBy, ErrorMessage } from "@/components/Groups/Form";

interface DocumentSelectProps {
	id: string;
	collection: string;
	value: number | undefined;
	onChange: (value: number | null, ref: DocumentRef | null) => void;
	ref: Accessor<DocumentRef | undefined>;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
}

export const DocumentSelect: Component<DocumentSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const openDocuSelectModal = () => {
		documentSelectStore.set({
			onSelectCallback: (doc: DocumentResponse) => {
				props.onChange(doc.id, {
					id: doc.id,
					collectionKey: doc.collectionKey,
					fields: helpers.objectifyFields(doc.fields || []),
				});
			},
			open: true,
			collectionKey: props.collection,
			selected: props.value,
		});
	};

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
			/>
			<div class="mt-2.5 w-full">
				<Switch>
					<Match when={typeof props.value !== "number"}>
						<Button
							type="button"
							theme="secondary"
							size="small"
							onClick={openDocuSelectModal}
							disabled={props.disabled}
							classes="capitalize"
						>
							{T()("select_document")}
						</Button>
					</Match>
					<Match when={typeof props.value === "number"}>
						{/* <div class="border border-border rounded-md p-4 bg-card-base mb-2.5">
							<For each={Object.values(props.ref()?.fields || {})}>
								{(field, i) => {
									if (field.type === "tab") return null;
									if (field.type === "repeater") return null;

									return (
										<Switch>
											<Match when={field.type === "text"}>
												{field.key}
												{field.value}
											</Match>
										</Switch>
									);
								}}
							</For>
						</div> */}
						<div class="w-full flex items-center gap-2.5">
							<Button
								type="button"
								theme="secondary"
								size="small"
								onClick={openDocuSelectModal}
								disabled={props.disabled}
								classes="capitalize"
							>
								<span class="line-clamp-1">
									{T()("selected_document", {
										id: props.value,
									})}
								</span>
								<span class="ml-2.5 flex items-center border-l border-current pl-2.5">
									<FaSolidPen size={12} class="text-current" />
								</span>
							</Button>
							<Button
								type="button"
								theme="border-outline"
								size="icon"
								onClick={() => {
									props.onChange(null, null);
								}}
								disabled={props.disabled}
								classes="capitalize"
							>
								<FaSolidXmark />
								<span class="sr-only">{T()("clear")}</span>
							</Button>
						</div>
					</Match>
				</Switch>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
