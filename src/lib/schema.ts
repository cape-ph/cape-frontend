import Ajv from 'ajv';
import type { AnySchema, ErrorObject, ValidateFunction } from 'ajv';

const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false
});

export type SchemaProperty = {
    type?: 'string' | 'integer' | 'number' | 'boolean';
    title?: string;
    description?: string;
    default?: unknown;
    const?: unknown;
    enum?: unknown[];
    minimum?: number;
    maximum?: number;
    min?: number;
    max?: number;
    step?: number;
};

export type ParameterField = {
    key: string;
    label: string;
    schema: SchemaProperty;
    required: boolean;
    readonly: boolean;
};

type ObjectSchema = {
    allOf?: unknown[];
    anyOf?: unknown[];
    oneOf?: unknown[];
    properties?: Record<string, SchemaProperty>;
    required?: string[];
};

type BufferShim = {
    isBuffer: (value: unknown) => boolean;
    from: (value: ArrayBuffer | ArrayLike<number> | string) => Uint8Array;
    alloc: (size: number) => Uint8Array;
};

export class UnsupportedSchemaError extends Error {
    constructor(keyword: 'anyOf' | 'oneOf') {
        super(`${keyword} schemas need an explicit UI choice before fields can be rendered`);
        this.name = 'UnsupportedSchemaError';
    }
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
    if (!errors || errors.length === 0) {
        return 'Unknown validation error';
    }

    return errors
        .map((err) => {
            const path = err.instancePath || '(root)';
            return `${path} ${err.message ?? 'is invalid'}`;
        })
        .join('; ');
}

export function compile(schema: AnySchema): ValidateFunction {
    return ajv.compile(schema);
}

export function validate<T = unknown>(isValid: ValidateFunction, obj: unknown): T {
    const valid = isValid(obj);
    if (!valid) {
        throw new Error(`Failed validation: ${formatAjvErrors(isValid.errors)}`);
    }
    return obj as T;
}

export async function getParameterFields(schema: unknown): Promise<ParameterField[]> {
    if (!schema || typeof schema !== 'object') {
        return [];
    }

    ensureBrowserBufferShim();

    const { dereference } = await import('@apidevtools/json-schema-ref-parser');
    const resolvedSchema = (await dereference(schema as object, {
        resolve: {
            external: false
        },
        dereference: {
            circular: false,
            cloneReferences: true
        },
        mutateInputSchema: false
    })) as ObjectSchema;

    const properties = collectProperties(resolvedSchema);
    const required = collectRequiredProperties(resolvedSchema);

    return Object.entries(properties).map(([key, propertySchema]) => ({
        key,
        label: getFieldLabel(key, propertySchema),
        schema: propertySchema,
        required: required.has(key),
        readonly: 'const' in propertySchema
    }));
}

function ensureBrowserBufferShim(): void {
    const globalRecord = globalThis as unknown as { Buffer?: BufferShim };

    if (globalRecord.Buffer) {
        return;
    }

    globalRecord.Buffer = {
        isBuffer: (value: unknown) => value instanceof Uint8Array,
        from: (value: ArrayBuffer | ArrayLike<number> | string) =>
            typeof value === 'string'
                ? new TextEncoder().encode(value)
                : new Uint8Array(value as ArrayBuffer | ArrayLike<number>),
        alloc: (size: number) => new Uint8Array(size)
    };
}

function collectProperties(schema: ObjectSchema): Record<string, SchemaProperty> {
    rejectUnsupportedCombinators(schema);

    const properties: Record<string, SchemaProperty> = {};

    for (const item of schema.allOf ?? []) {
        if (item && typeof item === 'object') {
            Object.assign(properties, collectProperties(item as ObjectSchema));
        }
    }

    Object.assign(properties, schema.properties ?? {});

    return properties;
}

function collectRequiredProperties(schema: ObjectSchema): Set<string> {
    rejectUnsupportedCombinators(schema);

    const required = new Set<string>();

    for (const item of schema.allOf ?? []) {
        if (item && typeof item === 'object') {
            for (const key of collectRequiredProperties(item as ObjectSchema)) {
                required.add(key);
            }
        }
    }

    for (const key of schema.required ?? []) {
        required.add(key);
    }

    return required;
}

function rejectUnsupportedCombinators(schema: ObjectSchema): void {
    if (schema.anyOf) {
        throw new UnsupportedSchemaError('anyOf');
    }

    if (schema.oneOf) {
        throw new UnsupportedSchemaError('oneOf');
    }
}

function getFieldLabel(key: string, propertySchema: SchemaProperty): string {
    return propertySchema.title ?? key.replace(/^-+/, '');
}

export function getDefaultOptions(fields: ParameterField[]): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    for (const field of fields) {
        if ('default' in field.schema) {
            defaults[field.key] = field.schema.default;
        } else if ('const' in field.schema) {
            defaults[field.key] = field.schema.const;
        } else if (field.schema.type === 'boolean') {
            defaults[field.key] = false;
        } else {
            defaults[field.key] = '';
        }
    }

    return defaults;
}

export function coerceOptionsForValidation(
    fields: ParameterField[],
    options: Record<string, unknown>
): Record<string, unknown> {
    const fieldsByKey = new Map(fields.map((field) => [field.key, field]));
    const typedData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(options)) {
        const field = fieldsByKey.get(key);

        if (!field) {
            typedData[key] = value;
            continue;
        }

        if (field.readonly) {
            typedData[key] = value;
            continue;
        }

        if (value === '' || value === null || value === undefined) {
            continue;
        }

        if (field.schema.type === 'integer' || field.schema.type === 'number') {
            typedData[key] = typeof value === 'number' ? value : Number(value);
        } else if (field.schema.type === 'boolean') {
            typedData[key] = Boolean(value);
        } else {
            typedData[key] = value;
        }
    }

    return typedData;
}

export function getCliOptionsString(options: Record<string, unknown>): string {
    return Object.entries(options)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key} ${quoteCliValue(value)}`)
        .join(' ');
}

function quoteCliValue(value: unknown): string {
    const stringValue = String(value);

    if (!/[\s"'\\]/.test(stringValue)) {
        return stringValue;
    }

    return `'${stringValue.replaceAll("'", "'\\''")}'`;
}
