// export default {
// 	files: ['../../../lexicons/com/atproto/**/*.json'],
// 	description: `Contains type declarations for core AT Protocol lexicons`,
// };

export default defineConfig({
	description: `Contains type declarations for Bluesky lexicons`,
	files: ['../../../lexicons/app/bsky/**/*.json', '../../../lexicons/chat/bsky/**/*.json'],
	outdir: 'lib/lexicons/',
	imports: {
		'com.atproto.*': '@atcute/atproto',
	},
});
