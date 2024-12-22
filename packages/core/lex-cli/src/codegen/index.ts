import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { glob } from 'fast-glob';
import prettier from 'prettier';

import {
	documentSchema,
	type BlobSchema,
	type DocumentSchema,
	type IpldTypeSchema,
	type MainUserTypeSchema,
	type ObjectSchema,
	type PrimitiveSchema,
	type RefVariantSchema,
	type UserTypeSchema,
	type XrpcProcedureSchema,
	type XrpcQuerySchema,
	type XrpcSubscriptionSchema,
} from '../schema.js';
import type { LexiconConfig } from '../types.js';

type DocumentMap = Map<string, DocumentSchema>;
type ImportSet = Set<string>;

class SourceFile {
	filename: string;

	header = '';
	body = '';

	constructor(filename: string) {
		this.filename = filename;
	}

	addNamedImport({ source, imported, local }: { source: string; imported: string; local?: string }) {
		this.header += `import { ${imported}${local ? ` as ${local}` : ``} } from ${JSON.stringify(source)};\n`;
	}

	addNamespaceImport({ source, local }: { source: string; local: string }) {
		this.header += `import * as ${local} from ${JSON.stringify(source)};\n`;
	}

	addTypeAlias({ isExported, name, type }: { isExported: boolean; name: string; type: string }) {
		this.body += `${isExported ? `export ` : ``}type ${name} = ${type};\n\n`;
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
		this.body += `${isExported ? `export ` : ``}const ${name} = ${initializer};\n\n`;
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
		this.body += `${isExported ? `export ` : ``}interface ${name} {${properties.map((p) => `${JSON.stringify(p.name)}${p.optional ? `?` : ``}:${p.type}`).join(';')}}\n\n`;
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
		const file = makeDocument(map, doc, false);

		const filename = path.join(config.outdir ?? 'lexicons', file.filename);
		const source = await file.source();

		await fs.mkdir(path.dirname(filename), { recursive: true });
		await fs.writeFile(filename, source);
	}
};

const getDocumentFilePath = (id: string) => {
	return `types/${id.replaceAll('.', '/')}.ts`;
};

const makeDocument = (map: DocumentMap, doc: DocumentSchema, isClient: boolean): SourceFile => {
	const filename = getDocumentFilePath(doc.id);
	const file = new SourceFile(filename);

	const imports: ImportSet = new Set();

	file.addNamedImport({ source: '@atcute/lexicons', imported: 'At', local: `$At` });
	file.addNamedImport({ source: '@atcute/lexicons', imported: 'Rpc', local: '$Rpc' });
	file.addNamespaceImport({ source: '@atcute/lexicons/validations', local: `$v` });

	const defs = doc.defs;

	if (defs.main) {
		const defUri = `${doc.id}#main`;
		const def = defs.main;

		switch (def.type) {
			case 'record': {
				break;
			}
			case 'query': {
				writeXrpcParams(file, def, !isClient);
				writeXrpcOutput(file, map, imports, defUri, def, false);
				writeXrpcType(file, defUri, def);
				break;
			}
			case 'procedure': {
				writeXrpcParams(file, def, !isClient);
				writeXrpcInput(file, map, imports, defUri, def, !isClient);
				writeXrpcOutput(file, map, imports, defUri, def, false);
				writeXrpcType(file, defUri, def);
				break;
			}
			case 'subscription': {
				writeXrpcParams(file, def, !isClient);
				writeXrpcOutput(file, map, imports, defUri, def, false);
				writeXrpcType(file, defUri, def);
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
			source: path.relative(dirname, target.replace(/\.ts$/, '.js')).replace(/^(?!\.{1,2}\/)/, './'),
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
			writeObject(file, map, imports, defUri, def);

			break;
		}
		case 'array': {
			break;
		}
	}
};

const writeObject = (
	file: SourceFile,
	map: DocumentMap,
	imports: ImportSet,
	defUri: string,
	def: ObjectSchema,
	interfaceName = toTitleCase(getHash(defUri)),
	includeType = true,
	defaultsArePresent = false,
) => {
	const required = new Set(def.required);
	const nullable = new Set(def.nullable);

	const entries = Object.entries(def.properties);

	{
		const members = entries.map(([prop, propDef]) => {
			const hasDefault = 'default' in propDef && propDef.default !== undefined;

			const isOptional = !(required.has(prop) || (defaultsArePresent && hasDefault));
			const isNullable = nullable.has(prop);

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
				type: makeType(type, { array, nullable: isNullable }),
			};
		});

		file.addInterface({
			isExported: true,
			name: interfaceName,
			properties: includeType
				? [
						{
							name: '$type',
							optional: true,
							type: JSON.stringify(stripMainHash(defUri)),
						},
						...members,
					]
				: members,
		});
	}

	{
		const properties = entries.map(([prop, propDef]) => {
			const hasDefault = 'default' in propDef && propDef.default !== undefined;

			// const isOptional = !(required.has(prop) || (defaultsArePresent && hasDefault));
			const isOptional = !required.has(prop);
			const isNullable = nullable.has(prop);

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

					value = `$v.array(${value})`;
					break;
				}
			}

			// if (isOptional) {
			// 	value = `$v.optional(${value})`;
			// } else if (hasDefault) {
			// 	value = `$v.optional(${value}, ${JSON.stringify(propDef.default)})`;
			// }
			if (isOptional) {
				if (!hasDefault) {
					value = `$v.optional(${value})`;
				} else {
					value = `$v.optional(${value}, ${JSON.stringify(propDef.default)})`;
				}
			}

			if (isNullable) {
				value = `$v.nullable(${value})`;
			}

			return `${JSON.stringify(prop)}: ${value}`;
		});

		const nsid = includeType ? JSON.stringify(stripMainHash(defUri)) : 'null';
		const expression = `$v.object<${interfaceName}>(${nsid}, {\n${properties.join(', ')}})`;

		file.addConstVariable({
			isExported: true,
			name: interfaceName + 'Schema',
			initializer: expression,
		});
	}
};

const writeXrpcParams = (
	file: SourceFile,
	def: XrpcQuerySchema | XrpcProcedureSchema | XrpcSubscriptionSchema,
	defaultsArePresent: boolean,
) => {
	const schema = def.parameters;
	if (!schema) {
		file.addTypeAlias({
			isExported: true,
			name: `Params`,
			type: `null`,
		});

		file.addConstVariable({
			isExported: true,
			name: `ParamsSchema`,
			initializer: `null`,
		});

		return;
	}

	const required = new Set(schema.required);
	const entries = Object.entries(schema.properties);

	{
		const members = entries.map(([prop, propDef]) => {
			const hasDefault = 'default' in propDef && propDef.default !== undefined;

			const isOptional = !(required.has(prop) || (defaultsArePresent && hasDefault));

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
					}

					array = true;
					break;
				}
			}

			return {
				name: prop,
				optional: isOptional,
				type: makeType(type, { array }),
			};
		});

		file.addInterface({
			isExported: true,
			name: `Params`,
			properties: members,
		});
	}

	{
		const properties = entries.map(([prop, propDef]) => {
			const hasDefault = 'default' in propDef && propDef.default !== undefined;

			// const isOptional = !(required.has(prop) || (defaultsArePresent && hasDefault));
			const isOptional = !required.has(prop);

			let value: string;

			switch (propDef.type) {
				case 'boolean':
				case 'integer':
				case 'string':
				case 'unknown': {
					value = makePrimitiveSchema(propDef);
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
					}

					value = `$v.array(${value})`;
					break;
				}
			}

			// if (isOptional) {
			// 	value = `$v.optional(${value})`;
			// } else if (hasDefault) {
			// 	value = `$v.optional(${value}, ${JSON.stringify(propDef.default)})`;
			// }
			if (isOptional) {
				if (!hasDefault) {
					value = `$v.optional(${value})`;
				} else {
					value = `$v.optional(${value}, ${JSON.stringify(propDef.default)})`;
				}
			}

			return `${JSON.stringify(prop)}: ${value}`;
		});

		const expression = `$v.object<Params>(null, {\n${properties.join(', ')}})`;

		file.addConstVariable({
			isExported: true,
			name: `ParamsSchema`,
			initializer: expression,
		});
	}
};

const writeXrpcInput = (
	file: SourceFile,
	map: DocumentMap,
	imports: ImportSet,
	defUri: string,
	def: XrpcProcedureSchema,
	defaultsArePresent: boolean,
) => {
	if (def.input?.schema) {
		const schema = def.input.schema;

		if (schema.type === 'ref' || schema.type === 'union') {
			file.addTypeAlias({
				isExported: true,
				name: `Input`,
				type: makeRefType(map, imports, defUri, schema),
			});

			file.addConstVariable({
				isExported: true,
				name: 'InputSchema',
				initializer: makeRefSchema(map, imports, defUri, schema),
			});
		} else {
			writeObject(file, map, imports, defUri, schema, `Input`, false, defaultsArePresent);
		}
	} else if (def.input?.encoding) {
		file.addTypeAlias({
			isExported: true,
			name: `Input`,
			type: `string | Uint8Array | Blob`,
		});

		file.addConstVariable({
			isExported: true,
			name: `InputSchema`,
			initializer: `null`,
		});
	} else {
		file.addTypeAlias({
			isExported: true,
			name: `Input`,
			type: `null`,
		});

		file.addConstVariable({
			isExported: true,
			name: `InputSchema`,
			initializer: `null`,
		});
	}
};

const writeXrpcOutput = (
	file: SourceFile,
	map: DocumentMap,
	imports: ImportSet,
	defUri: string,
	def: XrpcQuerySchema | XrpcProcedureSchema | XrpcSubscriptionSchema,
	defaultsArePresent: boolean,
) => {
	const schema = def.type === 'subscription' ? def.message?.schema : def.output?.schema;
	if (!schema) {
		file.addTypeAlias({
			isExported: true,
			name: `Output`,
			type: `null`,
		});

		file.addConstVariable({
			isExported: true,
			name: `OutputSchema`,
			initializer: `null`,
		});

		return;
	}

	if (schema.type === 'ref' || schema.type === 'union') {
		file.addTypeAlias({
			isExported: true,
			name: def.type !== 'subscription' ? `Output` : `Message`,
			type: makeRefType(map, imports, defUri, schema),
		});

		file.addConstVariable({
			isExported: true,
			name: def.type !== 'subscription' ? `OutputSchema` : `MessageSchema`,
			initializer: makeRefSchema(map, imports, defUri, schema),
		});
	} else {
		writeObject(file, map, imports, defUri, schema, `Output`, false, defaultsArePresent);
	}
};

const writeXrpcType = (
	file: SourceFile,
	defUri: string,
	def: XrpcQuerySchema | XrpcProcedureSchema | XrpcSubscriptionSchema,
) => {
	file.body += `declare module '@atcute/lexicons/ambient' {`;

	if (def.type === 'query') {
		const params = def.parameters;
		const output = def.output;

		let paramsType = 'null';
		let responseType = 'null';

		if (params) {
			paramsType = `Params`;
		}

		if (output) {
			if (output.schema) {
				if (output.encoding?.includes(',')) {
					responseType = `$Rpc.JsonResponse<Output> | $Rpc.BlobResponse | $Rpc.BytesResponse`;
				} else {
					responseType = `$Rpc.JsonResponse<Output>`;
				}
			} else if (output.encoding) {
				responseType = `$Rpc.BlobResponse | $Rpc.BytesResponse`;
			}
		}

		file.addInterface({
			isExported: false,
			name: `Queries`,
			properties: [
				{
					name: stripMainHash(defUri),
					type: `{\nparams: ${paramsType}; response: ${responseType} }`,
				},
			],
		});
	} else if (def.type === 'procedure') {
		const params = def.parameters;
		const input = def.input;
		const output = def.output;

		let paramsType = 'null';
		let bodyType = 'null';
		let responseType = 'null';

		if (params) {
			paramsType = `Params`;
		}

		if (input) {
			bodyType = `Input`;
		}

		if (output) {
			if (output.schema) {
				if (output.encoding?.includes(',')) {
					responseType = `$Rpc.JsonResponse<Output> | $Rpc.BlobResponse | $Rpc.BytesResponse`;
				} else {
					responseType = `$Rpc.JsonResponse<Output>`;
				}
			} else if (output.encoding) {
				responseType = `$Rpc.BlobResponse | $Rpc.BytesResponse`;
			}
		}

		file.addInterface({
			isExported: false,
			name: `Procedures`,
			properties: [
				{
					name: stripMainHash(defUri),
					type: `{\nparams: ${paramsType}; body: ${bodyType}; response: ${responseType} }`,
				},
			],
		});
	} else if (def.type === 'subscription') {
		const params = def.parameters;
		const message = def.message;

		let paramsType = 'null';
		let messageSchema = 'unknown';

		if (params) {
			paramsType = `Params`;
		}

		if (message?.schema) {
			messageSchema = `Message`;
		}

		file.addInterface({
			isExported: false,
			name: `Queries`,
			properties: [
				{
					name: stripMainHash(defUri),
					type: `{\nparams: ${paramsType}; message: ${messageSchema} }`,
				},
			],
		});
	}

	file.body += `}`;
	file.body += `\n\n`;
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

const makeRefType = (map: DocumentMap, imports: ImportSet, defUri: string, def: RefVariantSchema): string => {
	const refs = def.type === 'union' ? def.refs : [def.ref];

	const members = refs.map((ref): string => {
		if (ref.startsWith('#')) {
			const namespace = stripHash(defUri);
			const id = ref.slice(1);

			const res = resolveRef(map, defUri, namespace, id);

			switch (res.type) {
				case 'record': {
					return `Record`;
				}
				case 'object': {
					return toTitleCase(id);
				}
				case 'string': {
					if (def.type === 'union') {
						throw new Error(`${defUri} referenced ${ref}, a '${res.type}' definition`);
					}

					return toTitleCase(id);
				}
				default: {
					throw new Error(`${defUri} referenced ${ref}, a '${res.type}' definition`);
				}
			}
		} else {
			const [namespace, id = 'main'] = ref.split('#');

			const res = resolveRef(map, defUri, namespace, id);
			imports.add(namespace);

			switch (res.type) {
				case 'record': {
					return `${toTitleCase(namespace)}.Record`;
				}
				case 'object': {
					return `${toTitleCase(namespace)}.${toTitleCase(id)}`;
				}
				case 'string': {
					if (def.type === 'union') {
						throw new Error(`${defUri} referenced ${ref}, a '${res.type}' definition`);
					}

					return `${toTitleCase(namespace)}.${toTitleCase(id)}`;
				}
				default: {
					throw new Error(`${defUri} referenced ${ref}, a '${res.type}' definition`);
				}
			}
		}
	});

	if (def.type === 'union') {
		return `$At.Union<${makeType(members)}>`;
	}

	if (members.length !== 1) {
		throw new Error(`Assertion failed`);
	}

	return makeType(members);
};

const makeRefSchema = (
	map: DocumentMap,
	imports: ImportSet,
	defUri: string,
	def: RefVariantSchema,
): string => {
	const refs = def.type === 'union' ? def.refs : [def.ref];

	const members = refs.map((ref): string => {
		if (ref.startsWith('#')) {
			const namespace = stripHash(defUri);
			const id = ref.slice(1);

			const res = resolveRef(map, defUri, namespace, id);

			switch (res.type) {
				case 'record': {
					return `Record`;
				}
				case 'object': {
					return `${toTitleCase(id)}Schema`;
				}
				case 'string': {
					if (def.type === 'union') {
						throw new Error(`${defUri} referenced ${ref}, a '${res.type}' definition`);
					}

					return `${toTitleCase(id)}Schema`;
				}
				default: {
					throw new Error(`${defUri} referenced ${ref}, a '${res.type}' definition`);
				}
			}
		} else {
			const [namespace, id = 'main'] = ref.split('#');

			const res = resolveRef(map, defUri, namespace, id);
			imports.add(namespace);

			switch (res.type) {
				case 'record': {
					return `${toTitleCase(namespace)}.RecordSchema`;
				}
				case 'object': {
					return `${toTitleCase(namespace)}.${toTitleCase(id)}Schema`;
				}
				case 'string': {
					if (def.type === 'union') {
						throw new Error(`${defUri} referenced ${ref}, a '${res.type}' definition`);
					}

					return `${toTitleCase(namespace)}.${toTitleCase(id)}Schema`;
				}
				default: {
					throw new Error(`${defUri} referenced ${ref}, a '${res.type}' definition`);
				}
			}
		}
	});

	if (def.type === 'union') {
		return `$v.union(() => ${makeArray(members, true)}, ${def.closed})`;
	}

	if (members.length !== 1) {
		throw new Error(`Assertion failed`);
	}

	return `$v.ref(() => ${members[0]})`;
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
				return `$v.literal(${def.const})`;
			}

			return `$v.boolean()`;
		}
		case 'integer': {
			if (def.const) {
				const literal = '' + def.const;

				return `$v.literal(${literal})`;
			}

			if (def.enum) {
				const literals = def.enum.map((v) => '' + v);

				return `$v.literalEnum(${makeArray(literals, true)})`;
			}

			const constraints: string[] = [];

			if (def.maximum !== undefined || def.minimum !== undefined) {
				let args: string[];
				if (def.maximum !== undefined && def.minimum === undefined) {
					args = ['' + def.maximum];
				} else {
					args = ['' + def.maximum, '' + def.minimum];
				}

				constraints.push(`$v.constrainIntegerRange(${args.join(', ')})`);
			}

			return `$v.integer(${makeArray(constraints)})`;
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

				return `$v.${identifier}()`;
			}

			if (def.const) {
				const literal = JSON.stringify(def.const);

				return `$v.literal(${literal})`;
			}

			if (def.enum) {
				const literals = def.enum.map((v) => JSON.stringify(v));

				return `$v.literalEnum(${makeArray(literals, true)})`;
			}

			const constraints: string[] = [];

			if (def.maxGraphemes !== undefined || def.minGraphemes !== undefined) {
				let args: string[];
				if (def.maxGraphemes !== undefined && def.minGraphemes === undefined) {
					args = ['' + def.maxGraphemes];
				} else {
					args = ['' + def.maxGraphemes, '' + def.minGraphemes];
				}

				constraints.push(`$v.constrainStringGraphemes(${args.join(', ')})`);
			}

			if (def.maxLength !== undefined || def.minLength !== undefined) {
				let args: string[];
				if (def.maxLength !== undefined && def.minLength === undefined) {
					args = ['' + def.maxLength];
				} else {
					args = ['' + def.maxLength, '' + def.minLength];
				}

				constraints.push(`$v.constrainStringLength(${args.join(', ')})`);
			}

			return `$v.string(${makeArray(constraints)})`;
		}
		case 'unknown': {
			return `$v.unknown()`;
		}
	}
};

const makeLexType = (def: IpldTypeSchema | BlobSchema): string | string[] => {
	switch (def.type) {
		case 'blob': {
			return `$At.Blob`;
		}
		case 'bytes': {
			return `$At.Bytes`;
		}
		case 'cid-link': {
			return `$At.CidLink`;
		}
	}
};

const makeLexSchema = (def: IpldTypeSchema | BlobSchema): string => {
	switch (def.type) {
		case 'blob': {
			return `$v.blob()`;
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

				constraints.push(`$v.constrainBytesSize(${args.join(', ')})`);
			}

			return `$v.bytes(${makeArray(constraints)})`;
		}
		case 'cid-link': {
			return `$v.cidLink()`;
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

const getNsidPatterns = (nsid: string): string[] => {
	const parts = nsid.split('.');
	if (parts.length < 3) {
		return [];
	}

	const patterns = [nsid];
	for (let idx = parts.length - 1; idx > 1; idx--) {
		const pattern = parts.slice(0, idx).join('.') + `.*`;
		patterns.push(pattern);
	}

	return patterns;
};
