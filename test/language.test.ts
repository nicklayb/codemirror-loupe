import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { loupe, loupeLanguage, loupeManifestCompletion } from '../src/index.js';

describe('language support', () => {
  it('declares comment tokens', () => {
    const state = EditorState.create({ doc: '', extensions: [loupe()] });
    expect(state.languageDataAt('commentTokens', 0)).toEqual([{ line: '#' }]);
  });

  it('registers the completion source as language data', async () => {
    const completion = loupeManifestCompletion(
      { User: { fields: ['id'] } },
      { getCommands: () => [{ label: 'get' }] }
    );
    const state = EditorState.create({ doc: 'g', extensions: [loupe({ completion })] });
    const [source] = state.languageDataAt<typeof completion>('autocomplete', 1);
    const result = await source(new CompletionContext(state, 1, true));
    expect(result?.options.map((option) => option.label)).toEqual(['get']);
  });

  it('wraps a config in a completion source', () => {
    const state = EditorState.create({
      doc: '',
      extensions: [
        loupe({ completion: { getCommands: () => [], getSchemas: () => [], getFields: () => [] } })
      ]
    });
    expect(state.languageDataAt('autocomplete', 0)).toHaveLength(1);
  });

  it('parses with the language', () => {
    expect(loupeLanguage.parser.parse('get User').length).toBe(8);
  });
});
