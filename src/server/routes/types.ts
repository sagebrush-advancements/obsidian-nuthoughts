export type FrontmatterItem = {
	key: string;
	value: string;
	type: string; // "text" | "list" | "checkbox" | "tags"
};

export type Thought = {
	createdAt: number;
	content: string;
	project?: string | null;
	frontmatter?: FrontmatterItem[];
};
