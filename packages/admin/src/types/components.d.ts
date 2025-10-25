export interface TableRowProps {
	index: number;
	selected?: boolean;
	options?: {
		isSelectable?: boolean;
		padding?: "16" | "24";
		raisedActions?: boolean;
	};
	callbacks?: {
		setSelected?: (i: number) => void;
	};
}
