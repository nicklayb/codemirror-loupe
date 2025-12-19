import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
export interface LoupeCompletionContext {
    schema: string;
    fieldPath: string[];
    type: 'schema' | 'field' | 'operator' | 'keyword' | 'command';
}
export type SchemaProvider = (command: string) => Completion[] | Promise<Completion[]>;
export type FieldProvider = (context: LoupeCompletionContext) => Completion[] | Promise<Completion[]>;
export type CommandProvider = () => Completion[] | Promise<Completion[]>;
export interface LoupeCompletionConfig {
    getCommands: CommandProvider;
    getSchemas: SchemaProvider;
    getFields: FieldProvider;
}
export declare function loupeCompletion(config: LoupeCompletionConfig): (context: CompletionContext) => Promise<CompletionResult | null>;
//# sourceMappingURL=autocomplete.d.ts.map