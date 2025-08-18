// OpenSearch removed; keep function as no-op for compatibility

export interface IndexableContextDoc {
	tenant_id: string;
	context_id: string;
	type: string;
	title: string;
	instruction?: string;
	body: string;
	keywords?: string[];
	embedding: number[];
	status?: string;
	category_ids?: string[];
	category_names?: string[];
	category_slugs?: string[];
	intent_scopes?: string[];
	intent_actions?: string[];
	trust_level?: number;
	language?: string;
	attributes?: Record<string, unknown>;
	created_at?: string;
	updated_at?: string;
}

export async function indexContextDocument(doc: IndexableContextDoc) {
	const id = `${doc.tenant_id}:${doc.context_id}`;
	return { id } as const;
}


