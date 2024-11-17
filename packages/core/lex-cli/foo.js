import { generate } from './src/codegen/index';

await generate({
	files: ['../../../lexicons/com/atproto/**/*.json'],
	outdir: 'lexi/',
});
