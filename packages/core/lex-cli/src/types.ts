export interface LexiconConfig {
	files: string[];
	outdir?: string;
	imports?: Record<string, string | undefined>;
}
