import { LRLanguage, LanguageSupport } from '@codemirror/language';
export { loupeCompletion, type LoupeCompletionConfig, type LoupeCompletionContext, type SchemaProvider, type FieldProvider } from './autocomplete.js';
/**
 * Loupe language definition for CodeMirror.
 */
export declare const loupeLanguage: LRLanguage;
/**
 * Loupe language support extension for CodeMirror.
 *
 * @returns A LanguageSupport instance for the Loupe query language
 *
 * @example
 * ```typescript
 * import { EditorView, basicSetup } from 'codemirror';
 * import { loupe } from '@nicklayb/codemirror-lang-loupe';
 *
 * new EditorView({
 *   doc: 'get User where email = "user@example.com"',
 *   extensions: [basicSetup, loupe()],
 *   parent: document.querySelector('#editor')
 * });
 * ```
 */
export declare function loupe(): LanguageSupport;
//# sourceMappingURL=index.d.ts.map