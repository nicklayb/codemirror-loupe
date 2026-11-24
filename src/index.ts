import { parser } from './parser.js';
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside
} from '@codemirror/language';
import type { CompletionSource } from '@codemirror/autocomplete';
import { loupeHighlighting } from './highlight.js';
import { loupeCompletion, type LoupeCompletionConfig } from './autocomplete.js';

export {
  loupeCompletion,
  type LoupeCompletionConfig,
  type LoupeCompletionContext,
  type SchemaProvider,
  type FieldProvider,
  type CommandProvider,
  type AutocompleteEnabled
} from './autocomplete.js';

export {
  loupeManifestCompletion,
  manifestSchemas,
  manifestFields,
  resolveSchema,
  toCodemirrorFields,
  type LoupeManifest,
  type LoupeManifestOptions,
  type LoupeSchemaManifest,
  type LoupeFieldSet
} from './manifest.js';

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
  languageData: {
    commentTokens: { line: '#' },
    closeBrackets: { brackets: ['[', '{', '"', '('] }
  }
});


export interface LoupeConfig {
  /** Completion source, or a config for `loupeCompletion`. Registered as language data. */
  completion?: CompletionSource | LoupeCompletionConfig;
}

/**
 * Loupe language support extension for CodeMirror.
 *
 * With `completion`, `autocompletion()` picks the source up without `override`.
 *
 * @example
 * ```typescript
 * import { EditorView, basicSetup } from 'codemirror';
 * import { loupe } from '@nicklayb/codemirror-loupe';
 *
 * new EditorView({
 *   doc: 'get User where email = "user@example.com"',
 *   extensions: [basicSetup, loupe()],
 *   parent: document.querySelector('#editor')
 * });
 * ```
 */
export function loupe(config: LoupeConfig = {}) {
  const { completion } = config;
  const extensions = completion
    ? [
        loupeLanguage.data.of({
          autocomplete: typeof completion === 'function' ? completion : loupeCompletion(completion)
        })
      ]
    : [];
  return new LanguageSupport(loupeLanguage, extensions);
}
