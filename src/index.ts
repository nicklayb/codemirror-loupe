import { parser } from './parser.js';
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside
} from '@codemirror/language';
import { loupeHighlighting } from './highlight.js';

export {
  loupeCompletion,
  type LoupeCompletionConfig,
  type LoupeCompletionContext,
  type SchemaProvider,
  type FieldProvider
} from './autocomplete.js';

export const loupeLanguage = LRLanguage.define({
  name: 'loupe',
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Query: () => 0,
        Parameters: (context) => context.baseIndent + context.unit,
        List: (context) => context.baseIndent + context.unit
      }),
      foldNodeProp.add({
        Parameters: foldInside,
        List: foldInside,
        WhereClause: foldInside
      }),
      loupeHighlighting
    ]
  }),
});

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
export function loupe() {
  return new LanguageSupport(loupeLanguage);
}
