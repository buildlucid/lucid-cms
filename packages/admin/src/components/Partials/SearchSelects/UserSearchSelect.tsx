import T from "@/translations";
import { type Component, createSignal } from "solid-js";
import type { ValueT, SelectProps } from "@/components/Groups/Form/Select";
import type { ErrorResult, FieldError } from "@types";
import api from "@/services/api";
import helpers from "@/utils/helpers";
import { Select } from "@/components/Groups/Form";

interface UserSearchSelectProps {
	value: ValueT;
	setValue: (_value: ValueT) => void;
	name: string;
	id: string;
	copy?: SelectProps["copy"];
	errors?: ErrorResult | FieldError;
	altLocaleError?: boolean;
	localised?: boolean;
	theme: "basic" | "basic-small" | "full";
	disabled?: boolean;
	required?: boolean;
	fieldColumnIsMissing?: boolean;
}

const UserSearchSelect: Component<UserSearchSelectProps> = (props) => {
	const [getSearchQuery, setSearchQuery] = createSignal<string>("");

	// ----------------------------------
	// Queries
	const users = api.users.useGetMultiple({
		queryParams: {
			filters: {
				username: getSearchQuery() !== "" ? getSearchQuery : undefined,
				isDeleted: 0,
			},
		},
	});

	// ----------------------------------
	// Render
	return (
		<Select
			id={props.id}
			value={props.value}
			onChange={props.setValue}
			copy={{
				...props.copy,
				searchPlaceholder: T()("search_by_username"),
			}}
			name={props.name}
			search={{
				value: getSearchQuery(),
				onChange: setSearchQuery,
				isLoading: users.isLoading,
			}}
			options={
				users.data?.data.map((user) => ({
					value: user.id,
					label: helpers.formatUserName(user, "username"),
				})) || []
			}
			errors={props.errors}
			altLocaleError={props.altLocaleError}
			localised={props.localised}
			theme={props.theme}
			disabled={props.disabled}
			required={props.required}
			noClear={false}
			fieldColumnIsMissing={props.fieldColumnIsMissing}
		/>
	);
};

export default UserSearchSelect;
