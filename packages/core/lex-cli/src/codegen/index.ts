import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { glob } from 'fast-glob';
import prettier from 'prettier';

import {
	documentSchema,
	type UserTypeSchema,
	type DocumentSchema,
	type PrimitiveSchema,
	type IpldTypeSchema,
	type BlobSchema,
	type ObjectSchema,
	type RefVariantSchema,
	type MainUserTypeSchema,
} from '../schema.js';
import type { LexiconConfig } from '../types.js';

type DocumentMap = Map<string, DocumentSchema>;
type ImportSet = Set<string>;

class SourceFile {
	filename: string;

	private header = '';
	private body = '';

	constructor(filename: string) {
		this.filename = filename;
	}

	addNamedImport({ source, imported, local }: { source: string; imported: string; local?: string }) {
		this.header += `import { ${imported}${local ? ` as ${local}` : ``} } from ${JSON.stringify(source)};`;
	}

	addNamespaceImport({ source, local }: { source: string; local: string }) {
		this.header += `import * as ${local} from ${JSON.stringify(source)};`;
	}

	addTypeAlias({ isExported, name, type }: { isExported: boolean; name: string; type: string }) {
		this.body += `${isExported ? `export ` : ``}type ${name} = ${type};`;
	}

	addConstVariable({
		isExported,
		name,
		initializer,
	}: {
		isExported: boolean;
		name: string;
		initializer: string;
	}) {
		this.body += `${isExported ? `export ` : ``}const ${name} = ${initializer};`;
	}

	addInterface({
		isExported,
		name,
		properties,
	}: {
		isExported: boolean;
		name: string;
		properties: { name: string; optional?: boolean; type: string }[];
	}) {
		this.body += `${isExported ? `export ` : ``}interface ${name} {${properties.map((p) => `${p.name}${p.optional ? `?` : ``}:${p.type}`).join(';')}}`;
	}

	async source() {
		const raw = this.header + `\n\n` + this.body;
		const formatted = await prettier.format(raw, { parser: 'typescript' });

		return formatted;
	}
}

export const generate = async (config: LexiconConfig) => {
	const documents: DocumentSchema[] = [];

	// Load all the documents into memory
	for (const filename of await glob(config.files)) {
		let doc: DocumentSchema;

		try {
			const jsonString = await fs.readFile(filename, 'utf8');
			doc = documentSchema.parse(JSON.parse(jsonString), { mode: 'passthrough' });
		} catch (err) {
			throw new Error(`failed to read ${filename}`, { cause: err });
		}

		documents.push(doc);
	}

	// Sort all the documents, just in case.
	{
		const collator = new Intl.Collator('en');
		documents.sort((a, b) => collator.compare(a.id, b.id));
	}

	const map: DocumentMap = new Map(documents.map((doc) => [doc.id, doc]));

	// Write each document
	for (const doc of documents) {
		const file = makeDocument(map, doc);

		const filename = path.join(config.outdir ?? 'lexicons', file.filename);
		const source = await file.source();

		await fs.mkdir(path.dirname(filename), { recursive: true });
		await fs.writeFile(filename, source);
	}
};

const getDocumentFilePath = (id: string) => {
	return `types/${id.replaceAll('.', '/')}.ts`;
};

const makeDocument = (map: DocumentMap, doc: DocumentSchema): SourceFile => {
	const filename = getDocumentFilePath(doc.id);
	const file = new SourceFile(filename);

	const imports: ImportSet = new Set();

	file.addNamedImport({ source: '@atcute/lexicons', imported: 'At' });
	file.addNamespaceImport({ source: '@atcute/lexicons/validations', local: 'v' });

	const defs = doc.defs;

	if (defs.main) {
		const defUri = `${doc.id}#main`;
		const def = defs.main;

		switch (def.type) {
			case 'record': {
				break;
			}
			case 'query': {
				break;
			}
			case 'procedure': {
				break;
			}
			case 'subscription': {
				break;
			}
			default: {
				writeUserType(file, map, imports, defUri, def);
			}
		}
	}

	for (const [defId, def] of Object.entries<UserTypeSchema>(doc.defs)) {
		if (defId === 'main') {
			continue;
		}

		const defUri = `${doc.id}#${defId}`;
		writeUserType(file, map, imports, defUri, def);
	}

	writeImports(file, imports);

	return file;
};

const writeImports = (file: SourceFile, imports: ImportSet) => {
	const filename = file.filename;
	const dirname = path.dirname(filename);

	for (const ns of imports) {
		const target = getDocumentFilePath(ns);

		file.addNamespaceImport({
			source: path.relative(dirname, target.replace(/\.ts$/, '.js')),
			local: toTitleCase(stripHash(ns)),
		});
	}
};

const writeUserType = (
	file: SourceFile,
	map: DocumentMap,
	imports: ImportSet,
	defUri: string,
	def: UserTypeSchema,
): void => {
	switch (def.type) {
		case 'boolean':
		case 'integer':
		case 'string':
		case 'unknown': {
			file.addTypeAlias({
				isExported: true,
				name: toTitleCase(getHash(defUri)),
				type: makeType(makePrimitiveType(def)),
			});

			file.addConstVariable({
				isExported: true,
				name: toTitleCase(getHash(defUri)) + 'Schema',
				initializer: makePrimitiveSchema(def),
			});

			break;
		}
		case 'blob':
		case 'bytes':
		case 'cid-link': {
			file.addTypeAlias({
				isExported: true,
				name: toTitleCase(getHash(defUri)),
				type: makeType(makeLexType(def)),
			});

			file.addConstVariable({
				isExported: true,
				name: toTitleCase(getHash(defUri)) + 'Schema',
				initializer: makeLexSchema(def),
			});

			break;
		}
		case 'token': {
			file.addTypeAlias({
				isExported: true,
				name: toTitleCase(getHash(defUri)),
				type: JSON.stringify(stripMainHash(defUri)),
			});

			break;
		}
		case 'object': {
			writeObjectType(file, map, imports, defUri, def);

			break;
		}
		case 'array': {
			break;
		}
	}
};

const writeObjectType = (
	file: SourceFile,
	map: DocumentMap,
	imports: ImportSet,
	defUri: string,
	def: ObjectSchema,
	interfaceName = toTitleCase(getHash(defUri)),
	defaultsArePresent = true,
) => {
	const required = new Set(def.required);
	const nullable = new Set(def.nullable);

	const entries = Object.entries(def.properties);

	{
		file.addInterface({
			isExported: true,
			name: interfaceName,
			properties: [
				{
					name: '$type',
					optional: true,
					type: JSON.stringify(stripMainHash(defUri)),
				},
				...entries.map(([prop, propDef]) => {
					const isOptional = !(
						required.has(prop) ||
						(defaultsArePresent && 'default' in propDef && propDef.default !== undefined)
					);

					let type: string | string[];
					let array = false;

					switch (propDef.type) {
						case 'boolean':
						case 'integer':
						case 'string':
						case 'unknown': {
							type = makePrimitiveType(propDef);
							break;
						}
						case 'blob':
						case 'bytes':
						case 'cid-link': {
							type = makeLexType(propDef);
							break;
						}
						case 'ref':
						case 'union': {
							type = makeRefType(map, imports, defUri, propDef);
							break;
						}
						case 'array': {
							const itemDef = propDef.items;

							switch (itemDef.type) {
								case 'boolean':
								case 'integer':
								case 'string':
								case 'unknown': {
									type = makePrimitiveType(itemDef);
									break;
								}
								case 'blob':
								case 'bytes':
								case 'cid-link': {
									type = makeLexType(itemDef);
									break;
								}
								case 'ref':
								case 'union': {
									type = makeRefType(map, imports, defUri, itemDef);
									break;
								}
							}

							array = true;
							break;
						}
					}

					return {
						name: prop,
						optional: isOptional,
						type: makeType(type, { array, nullable: nullable.has(prop) }),
					};
				}),
			],
		});
	}

	{
		const properties = entries.map(([prop, propDef]) => {
			const isOptional = !(
				required.has(prop) ||
				(defaultsArePresent && 'default' in propDef && propDef.default !== undefined)
			);

			let value: string;

			switch (propDef.type) {
				case 'boolean':
				case 'integer':
				case 'string':
				case 'unknown': {
					value = makePrimitiveSchema(propDef);
					break;
				}
				case 'blob':
				case 'bytes':
				case 'cid-link': {
					value = makeLexSchema(propDef);
					break;
				}
				case 'ref':
				case 'union': {
					value = makeRefSchema(map, imports, defUri, propDef);
					break;
				}
				case 'array': {
					const itemDef = propDef.items;

					switch (itemDef.type) {
						case 'boolean':
						case 'integer':
						case 'string':
						case 'unknown': {
							value = makePrimitiveSchema(itemDef);
							break;
						}
						case 'blob':
						case 'bytes':
						case 'cid-link': {
							value = makeLexSchema(itemDef);
							break;
						}
						case 'ref':
						case 'union': {
							value = makeRefSchema(map, imports, defUri, itemDef);
							break;
						}
					}

					value = `v.array(${value})`;
					break;
				}
			}

			if (isOptional) {
				value = `v.optional(${value})`;
			}
			if (nullable.has(prop)) {
				value = `v.nullable(${value})`;
			}

			return `${JSON.stringify(prop)}: ${value}`;
		});

		const nsid = stripMainHash(defUri);
		const expression = `v.object<${interfaceName}>(${JSON.stringify(nsid)}, {\n${properties.join(', ')}})`;

		file.addConstVariable({
			isExported: true,
			name: interfaceName + 'Schema',
			initializer: expression,
		});
	}
};

const resolveRef = (map: DocumentMap, defUri: string, namespace: string, id: string): MainUserTypeSchema => {
	const doc = map.get(namespace);
	if (doc === undefined) {
		throw new Error(`'${defUri}' imported non-existent '${namespace}' namespace`);
	}

	const def = doc.defs[id];
	if (def === undefined) {
		throw new Error(`'${defUri}' imported non-existent '${id}' definition from '${namespace}' namespace`);
	}

	return def;
};

const makeRefType = (
	map: DocumentMap,
	imports: ImportSet,
	defUri: string,
	def: RefVariantSchema,
): string | string[] => {
	switch (def.type) {
		case 'ref': {
			const ref = def.ref;

			if (ref.startsWith('#')) {
				const namespace = stripHash(defUri);
				const id = ref.slice(1);

				const def = resolveRef(map, defUri, namespace, id);

				switch (def.type) {
					case 'procedure':
					case 'query':
					case 'subscription': {
						throw new Error(`${defUri} referenced ${ref}, a '${def.type}' definition`);
					}
					case 'record': {
						return `Record`;
					}
					default: {
						return `${toTitleCase(id)}`;
					}
				}
			} else {
				const [namespace, id = 'main'] = ref.split('#');

				const def = resolveRef(map, defUri, namespace, id);
				imports.add(namespace);

				switch (def.type) {
					case 'procedure':
					case 'query':
					case 'subscription': {
						throw new Error(`${defUri} referenced ${ref}, a '${def.type}' definition`);
					}
					case 'record': {
						return `${toTitleCase(namespace)}.Record`;
					}
					default: {
						return `${toTitleCase(namespace)}.${toTitleCase(id)}`;
					}
				}
			}
		}
		case 'union': {
			const union = def.refs.map((ref): string => {
				if (ref.startsWith('#')) {
					const namespace = stripHash(defUri);
					const id = ref.slice(1);

					const def = resolveRef(map, defUri, namespace, id);

					switch (def.type) {
						case 'procedure':
						case 'query':
						case 'subscription': {
							throw new Error(`${defUri} referenced ${ref}, a '${def.type}' definition`);
						}
						case 'record': {
							return `Record`;
						}
						default: {
							return `${toTitleCase(id)}`;
						}
					}
				} else {
					const [namespace, id = 'main'] = ref.split('#');

					const def = resolveRef(map, defUri, namespace, id);
					imports.add(namespace);

					switch (def.type) {
						case 'record': {
							return `${toTitleCase(namespace)}.Record`;
						}
						case 'object': {
							return `${toTitleCase(namespace)}.${toTitleCase(id)}`;
						}
						default: {
							throw new Error(`${defUri} referenced ${ref}, a '${def.type}' definition`);
						}
					}
				}
			});

			// `closed` is currently ignored
			return union;
		}
	}
};

const makeRefSchema = (
	map: DocumentMap,
	imports: ImportSet,
	defUri: string,
	def: RefVariantSchema,
): string => {
	switch (def.type) {
		case 'ref': {
			const ref = def.ref;

			if (ref.startsWith('#')) {
				const namespace = stripHash(defUri);
				const id = ref.slice(1);

				const def = resolveRef(map, defUri, namespace, id);

				switch (def.type) {
					case 'procedure':
					case 'query':
					case 'subscription': {
						throw new Error(`${defUri} referenced ${ref}, a '${def.type}' definition`);
					}
					case 'record': {
						return `v.ref(() => RecordSchema)`;
					}
					default: {
						return `v.ref(() => ${toTitleCase(id) + `Schema`})`;
					}
				}
			} else {
				const [namespace, id = 'main'] = ref.split('#');

				const def = resolveRef(map, defUri, namespace, id);
				imports.add(namespace);

				switch (def.type) {
					case 'procedure':
					case 'query':
					case 'subscription': {
						throw new Error(`${defUri} referenced ${ref}, a '${def.type}' definition`);
					}
					case 'record': {
						return `v.ref(() => ${toTitleCase(namespace)}.RecordSchema)`;
					}
					default: {
						return `v.ref(() => ${toTitleCase(namespace)}.${toTitleCase(id) + `Schema`})`;
					}
				}
			}
		}
		case 'union': {
			const members = def.refs.map((ref): string => {
				if (ref.startsWith('#')) {
					const namespace = stripHash(defUri);
					const id = ref.slice(1);

					const def = resolveRef(map, defUri, namespace, id);

					switch (def.type) {
						case 'procedure':
						case 'query':
						case 'subscription': {
							throw new Error(`${defUri} referenced ${ref}, a '${def.type}' definition`);
						}
						case 'record': {
							return `RecordSchema`;
						}
						default: {
							return toTitleCase(id) + `Schema`;
						}
					}
				} else {
					const [namespace, id = 'main'] = ref.split('#');

					const def = resolveRef(map, defUri, namespace, id);
					imports.add(namespace);

					switch (def.type) {
						case 'record': {
							return `${toTitleCase(namespace)}.RecordSchema`;
						}
						case 'object': {
							return `${toTitleCase(namespace)}.${toTitleCase(id) + `Schema`}`;
						}
						default: {
							throw new Error(`${defUri} referenced ${ref}, a '${def.type}' definition`);
						}
					}
				}
			});

			return `v.union(() => ${makeArray(members, true)}, ${def.closed})`;
		}
	}
};

const makePrimitiveType = (def: PrimitiveSchema): string | string[] => {
	switch (def.type) {
		case 'boolean': {
			if (def.const) {
				return JSON.stringify(def.const);
			}

			return 'boolean';
		}
		case 'integer': {
			if (def.const) {
				return JSON.stringify(def.const);
			}

			if (def.enum) {
				return def.enum.map((v) => JSON.stringify(v));
			}

			return 'number';
		}
		case 'string': {
			if (def.const) {
				return JSON.stringify(def.const);
			}

			if (def.enum) {
				return def.enum.map((v) => JSON.stringify(v));
			}

			if (def.knownValues) {
				return [...def.knownValues.map((v) => JSON.stringify(v)), '(string & {})'];
			}

			return 'string';
		}
		case 'unknown': {
			return 'unknown';
		}
	}
};

const makePrimitiveSchema = (def: PrimitiveSchema): string => {
	switch (def.type) {
		case 'boolean': {
			if (def.const) {
				return `v.literal(${def.const})`;
			}

			return `v.boolean()`;
		}
		case 'integer': {
			if (def.const) {
				const literal = '' + def.const;

				return `v.literal(${literal})`;
			}

			if (def.enum) {
				const literals = def.enum.map((v) => '' + v);

				return `v.literalEnum(${makeArray(literals, true)})`;
			}

			const constraints: string[] = [];

			if (def.maximum !== undefined || def.minimum !== undefined) {
				let args: string[];
				if (def.maximum !== undefined && def.minimum === undefined) {
					args = ['' + def.maximum];
				} else {
					args = ['' + def.maximum, '' + def.minimum];
				}

				constraints.push(`v.constrainIntegerRange(${args.join(', ')})`);
			}

			return `v.integer(${makeArray(constraints)})`;
		}
		case 'string': {
			if (def.format) {
				let identifier: string;

				switch (def.format) {
					case 'at-identifier': {
						identifier = 'atIdentifierString';
						break;
					}
					case 'at-uri': {
						identifier = 'atUriString';
						break;
					}
					case 'cid': {
						identifier = 'cidString';
						break;
					}
					case 'datetime': {
						identifier = 'datetimeString';
						break;
					}
					case 'did': {
						identifier = 'didString';
						break;
					}
					case 'handle': {
						identifier = 'handleString';
						break;
					}
					case 'language': {
						identifier = 'languageString';
						break;
					}
					case 'nsid': {
						identifier = 'nsidString';
						break;
					}
					case 'record-key': {
						identifier = 'recordKeyString';
						break;
					}
					case 'tid': {
						identifier = 'tidString';
						break;
					}
					case 'uri': {
						identifier = 'uriString';
						break;
					}
				}

				return `v.${identifier}()`;
			}

			if (def.const) {
				const literal = JSON.stringify(def.const);

				return `v.literal(${literal})`;
			}

			if (def.enum) {
				const literals = def.enum.map((v) => JSON.stringify(v));

				return `v.literalEnum(${makeArray(literals, true)})`;
			}

			const constraints: string[] = [];

			if (def.maxGraphemes !== undefined || def.minGraphemes !== undefined) {
				let args: string[];
				if (def.maxGraphemes !== undefined && def.minGraphemes === undefined) {
					args = ['' + def.maxGraphemes];
				} else {
					args = ['' + def.maxGraphemes, '' + def.minGraphemes];
				}

				constraints.push(`v.constrainStringGraphemes(${args.join(', ')})`);
			}

			if (def.maxLength !== undefined || def.minLength !== undefined) {
				let args: string[];
				if (def.maxLength !== undefined && def.minLength === undefined) {
					args = ['' + def.maxLength];
				} else {
					args = ['' + def.maxLength, '' + def.minLength];
				}

				constraints.push(`v.constrainStringLength(${args.join(', ')})`);
			}

			return `v.string(${makeArray(constraints)})`;
		}
		case 'unknown': {
			return `v.unknown()`;
		}
	}
};

const makeLexType = (def: IpldTypeSchema | BlobSchema): string | string[] => {
	switch (def.type) {
		case 'blob': {
			return 'At.Blob';
		}
		case 'bytes': {
			return 'At.Bytes';
		}
		case 'cid-link': {
			return 'At.CidLink';
		}
	}
};

const makeLexSchema = (def: IpldTypeSchema | BlobSchema): string => {
	switch (def.type) {
		case 'blob': {
			return `v.blob()`;
		}
		case 'bytes': {
			const constraints: string[] = [];

			if (def.maxLength !== undefined || def.minLength !== undefined) {
				let args: string[];
				if (def.maxLength !== undefined && def.minLength === undefined) {
					args = ['' + def.maxLength];
				} else {
					args = ['' + def.maxLength, '' + def.minLength];
				}

				constraints.push(`v.constrainBytesSize(${args.join(', ')})`);
			}

			return `v.bytes(${makeArray(constraints)})`;
		}
		case 'cid-link': {
			return `v.cidLink()`;
		}
	}
};

const makeArray = (constraints: string[], canBeEmpty?: boolean): string => {
	if (canBeEmpty || constraints.length !== 0) {
		return `[${constraints.join(', ')}]`;
	}

	return ``;
};

const makeType = (types: string | string[], options?: { array?: boolean; nullable?: boolean }) => {
	const suffix = options?.array ? '[]' : '';

	if (!Array.isArray(types)) {
		types = [types];
	}

	if (options?.nullable) {
		types.push('null');
	}

	if (types.length === 1) {
		return types[0] + suffix;
	}

	if (options?.array) {
		return `(${types.join(' | ')})` + suffix;
	}

	return types.join(' | ');
};

const stripHash = (defUri: string): string => {
	const index = defUri.indexOf('#');
	if (index === -1) {
		return defUri;
	}

	return defUri.slice(0, index);
};

const getHash = (defUri: string): string => {
	const index = defUri.indexOf('#');
	if (index === -1) {
		return '';
	}

	return defUri.slice(index + 1);
};
const stripMainHash = (defUri: string): string => {
	return defUri.endsWith('#main') ? defUri.slice(0, -'#main'.length) : defUri;
};

const toTitleCase = (v: string): string => {
	v = v.replace(/^([a-z])/gi, (_, g) => g.toUpperCase()); // upper-case first letter
	v = v.replace(/[.#-]([a-z])/gi, (_, g) => g.toUpperCase()); // uppercase any dash, dot, or hash segments
	return v.replace(/[.-]/g, ''); // remove lefover dashes or dots
};

const toCamelCase = (v: string): string => {
	v = v.replace(/[.#-]([a-z])/gi, (_, g) => g.toUpperCase()); // uppercase any dash, dot, or hash segments
	return v.replace(/[.-]/g, ''); // remove lefover dashes or dots
};

const toScreamingSnakeCase = (v: string): string => {
	v = v.replace(/[.#-]+/gi, '_'); // convert dashes, dots, and hashes into underscores
	return v.toUpperCase(); // and scream!
};
