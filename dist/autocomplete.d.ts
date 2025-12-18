import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
/**
 * Completion context passed to callback functions
 */
export interface LoupeCompletionContext {
    /** The schema name being queried (e.g., "User") */
    schema: string;
    /** The field path typed so far (e.g., ["user", "role"] for "user.role.") */
    fieldPath: string[];
    /** Type of completion being requested */
    type: 'schema' | 'field' | 'operator' | 'keyword' | 'command';
}
/**
 * Callback for providing schemas
 */
export type SchemaProvider = () => Completion[] | Promise<Completion[]>;
/**
 * Callback for providing fields based on the current context
 */
export type FieldProvider = (context: LoupeCompletionContext) => Completion[] | Promise<Completion[]>;
/**
 * Configuration for Loupe autocompletion
 */
export interface LoupeCompletionConfig {
    /** Callback to provide available commands (e.g., get, find, fetch) */
    getCommands: () => Completion[] | Promise<Completion[]>;
    /** Callback to provide available schemas */
    getSchemas: SchemaProvider;
    /** Callback to provide fields for a given schema and path */
    getFields: FieldProvider;
}
/**
 * Creates a Loupe autocompletion source
 */
export declare function loupeCompletion(config: LoupeCompletionConfig): (context: CompletionContext) => Promise<CompletionResult | null>;
//# sourceMappingURL=autocomplete.d.ts.map