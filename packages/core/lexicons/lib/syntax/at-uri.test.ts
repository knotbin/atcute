import { describe, expect, it } from 'bun:test';

import { isValidAtUri } from './at-uri.js';

describe('matches interop test', () => {
	// https://github.com/bluesky-social/atproto-interop-tests/commit/94186876e41ab41cf93a0e051322ffbdd82dad9f

	it('passes valid tests', () => {
		const test = `
# enforces spec basics
at://did:plc:asdf123
at://user.bsky.social
at://did:plc:asdf123/com.atproto.feed.post
at://did:plc:asdf123/com.atproto.feed.post/record

# very long: 'at://did:plc:asdf123/com.atproto.feed.post/' + 'o'.repeat(512)
at://did:plc:asdf123/com.atproto.feed.post/oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo

# enforces no trailing slashes
at://did:plc:asdf123
at://user.bsky.social
at://did:plc:asdf123/com.atproto.feed.post
at://did:plc:asdf123/com.atproto.feed.post/record

# enforces strict paths
at://did:plc:asdf123/com.atproto.feed.post/asdf123

# is very permissive about record keys
at://did:plc:asdf123/com.atproto.feed.post/asdf123
at://did:plc:asdf123/com.atproto.feed.post/a

at://did:plc:asdf123/com.atproto.feed.post/asdf-123
at://did:abc:123
at://did:abc:123/io.nsid.someFunc/record-key

at://did:abc:123/io.nsid.someFunc/self.
at://did:abc:123/io.nsid.someFunc/lang:
at://did:abc:123/io.nsid.someFunc/:
at://did:abc:123/io.nsid.someFunc/-
at://did:abc:123/io.nsid.someFunc/_
at://did:abc:123/io.nsid.someFunc/~
at://did:abc:123/io.nsid.someFunc/...
`;

		for (const line of test.split('\n')) {
			if (!line.trim() || line.startsWith('#')) {
				continue;
			}

			expect(isValidAtUri(line), `${line} should pass`).toBe(true);
		}
	});

	it('passes invalid tests', () => {
		const test = `
# enforces spec basics
a://did:plc:asdf123
at//did:plc:asdf123
at:/a/did:plc:asdf123
at:/did:plc:asdf123
AT://did:plc:asdf123
http://did:plc:asdf123
://did:plc:asdf123
at:did:plc:asdf123
at:/did:plc:asdf123
at:///did:plc:asdf123
at://:/did:plc:asdf123
at:/ /did:plc:asdf123
at://did:plc:asdf123 
at://did:plc:asdf123/ 
 at://did:plc:asdf123
at://did:plc:asdf123/com.atproto.feed.post 
at://did:plc:asdf123/com.atproto.feed.post# 
at://did:plc:asdf123/com.atproto.feed.post#/ 
at://did:plc:asdf123/com.atproto.feed.post#/frag 
at://did:plc:asdf123/com.atproto.feed.post#fr ag
//did:plc:asdf123
at://name
at://name.0
at://diD:plc:asdf123
at://did:plc:asdf123/com.atproto.feed.p@st
at://did:plc:asdf123/com.atproto.feed.p$st
at://did:plc:asdf123/com.atproto.feed.p%st
at://did:plc:asdf123/com.atproto.feed.p&st
at://did:plc:asdf123/com.atproto.feed.p()t
at://did:plc:asdf123/com.atproto.feed_post
at://did:plc:asdf123/-com.atproto.feed.post
at://did:plc:asdf@123/com.atproto.feed.post
at://DID:plc:asdf123
at://user.bsky.123
at://bsky
at://did:plc:
at://did:plc:
at://frag

# too long: 'at://did:plc:asdf123/com.atproto.feed.post/' + 'o'.repeat(8200)
at://did:plc:asdf123/com.atproto.feed.post/oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo

# has specified behavior on edge cases
at://user.bsky.social//
at://user.bsky.social//com.atproto.feed.post
at://user.bsky.social/com.atproto.feed.post//
at://did:plc:asdf123/com.atproto.feed.post/asdf123/more/more',
at://did:plc:asdf123/short/stuff
at://did:plc:asdf123/12345

# enforces no trailing slashes
at://did:plc:asdf123/
at://user.bsky.social/
at://did:plc:asdf123/com.atproto.feed.post/
at://did:plc:asdf123/com.atproto.feed.post/record/
at://did:plc:asdf123/com.atproto.feed.post/record/#/frag

# enforces strict paths
at://did:plc:asdf123/com.atproto.feed.post/asdf123/asdf

# is very permissive about fragments
at://did:plc:asdf123#
at://did:plc:asdf123##
#at://did:plc:asdf123
at://did:plc:asdf123#/asdf#/asdf

# new less permissive about record keys for Lexicon use (with recordkey more specified)
at://did:plc:asdf123/com.atproto.feed.post/%23
at://did:plc:asdf123/com.atproto.feed.post/$@!*)(:,;~.sdf123
at://did:plc:asdf123/com.atproto.feed.post/~'sdf123")
at://did:plc:asdf123/com.atproto.feed.post/$
at://did:plc:asdf123/com.atproto.feed.post/@
at://did:plc:asdf123/com.atproto.feed.post/!
at://did:plc:asdf123/com.atproto.feed.post/*
at://did:plc:asdf123/com.atproto.feed.post/(
at://did:plc:asdf123/com.atproto.feed.post/,
at://did:plc:asdf123/com.atproto.feed.post/;
at://did:plc:asdf123/com.atproto.feed.post/abc%30123
at://did:plc:asdf123/com.atproto.feed.post/%30
at://did:plc:asdf123/com.atproto.feed.post/%3
at://did:plc:asdf123/com.atproto.feed.post/%
at://did:plc:asdf123/com.atproto.feed.post/%zz
at://did:plc:asdf123/com.atproto.feed.post/%%%

# disallow dot / double-dot
at://did:plc:asdf123/com.atproto.feed.post/.
at://did:plc:asdf123/com.atproto.feed.post/..
`;

		for (const line of test.split('\n')) {
			if (!line.trim() || line.startsWith('#')) {
				continue;
			}

			expect(isValidAtUri(line), `${line} should not pass`).toBe(false);
		}
	});
});
