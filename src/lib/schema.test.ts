import { describe, expect, it } from 'vitest';
import {
    UnsupportedSchemaError,
    coerceOptionsForValidation,
    getDefaultOptions,
    getParameterFields
} from './schema';

describe('schema utilities', () => {
    it('extracts fields from root properties and local allOf references', async () => {
        const fields = await getParameterFields({
            type: 'object',
            required: ['--sample'],
            properties: {
                '--sample': { type: 'string', title: 'Sample' }
            },
            allOf: [{ $ref: '#/$defs/base' }],
            $defs: {
                base: {
                    type: 'object',
                    required: ['--max_cpus'],
                    properties: {
                        '--max_cpus': { type: 'integer', default: 2 },
                        '-profile': { const: 'aws' }
                    }
                }
            }
        });

        expect(fields).toEqual([
            expect.objectContaining({
                key: '--max_cpus',
                required: true,
                readonly: false,
                schema: expect.objectContaining({ default: 2, type: 'integer' })
            }),
            expect.objectContaining({
                key: '-profile',
                required: false,
                readonly: true,
                schema: expect.objectContaining({ const: 'aws' })
            }),
            expect.objectContaining({
                key: '--sample',
                label: 'Sample',
                required: true,
                readonly: false
            })
        ]);
    });

    it('rejects branch schemas that need explicit UI selection', async () => {
        await expect(
            getParameterFields({
                type: 'object',
                oneOf: [
                    { properties: { mode: { const: 'a' } } },
                    { properties: { mode: { const: 'b' } } }
                ]
            })
        ).rejects.toBeInstanceOf(UnsupportedSchemaError);
    });

    it('builds default option state from field metadata', () => {
        const defaults = getDefaultOptions([
            {
                key: '--sample',
                label: 'Sample',
                schema: { type: 'string', default: 'sample-001' },
                required: true,
                readonly: false
            },
            {
                key: '-profile',
                label: 'profile',
                schema: { const: 'aws' },
                required: false,
                readonly: true
            },
            {
                key: '--dry_run',
                label: 'Dry run',
                schema: { type: 'boolean' },
                required: false,
                readonly: false
            }
        ]);

        expect(defaults).toEqual({
            '--sample': 'sample-001',
            '-profile': 'aws',
            '--dry_run': false
        });
    });

    it('coerces validation data without including empty optional values', () => {
        const typedData = coerceOptionsForValidation(
            [
                {
                    key: '--max_cpus',
                    label: 'Max CPUs',
                    schema: { type: 'integer' },
                    required: false,
                    readonly: false
                },
                {
                    key: '--optional',
                    label: 'Optional',
                    schema: { type: 'string' },
                    required: false,
                    readonly: false
                },
                {
                    key: '-profile',
                    label: 'profile',
                    schema: { const: 'aws' },
                    required: false,
                    readonly: true
                }
            ],
            {
                '--max_cpus': '8',
                '--optional': '',
                '-profile': 'aws'
            }
        );

        expect(typedData).toEqual({
            '--max_cpus': 8,
            '-profile': 'aws'
        });
    });
});
