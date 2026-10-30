import {
	type Accessor,
	createContext,
	type ParentComponent,
	useContext,
} from "solid-js";
import type { FieldAccess } from "@/utils/resolve-field-access";

const editable: Accessor<FieldAccess> = () => "editable";
const FieldAccessContext = createContext(editable);

export const FieldAccessProvider: ParentComponent<{
	access: Accessor<FieldAccess>;
}> = (props) => {
	return (
		<FieldAccessContext.Provider value={props.access}>
			{props.children}
		</FieldAccessContext.Provider>
	);
};

/** Returns access to the nearest brick or field, defaulting to editable outside documents. */
export const useFieldAccess = () => {
	return useContext(FieldAccessContext);
};
