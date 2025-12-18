import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

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
export type SchemaProvider = (command: string) => Completion[] | Promise<Completion[]>;

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

const KEYWORDS: Completion[] = [
  { label: 'where', type: 'keyword', info: 'Filter condition', detail: undefined },
  { label: 'and', type: 'keyword', info: 'Logical AND', detail: undefined },
  { label: 'or', type: 'keyword', info: 'Logical OR', detail: undefined },
  { label: 'not', type: 'keyword', info: 'Logical NOT', detail: undefined },
  { label: 'in', type: 'keyword', info: 'Check if value is in list', detail: undefined },
  { label: 'like', type: 'keyword', info: 'Pattern matching', detail: undefined },
  { label: 'empty', type: 'keyword', info: 'Check if field is empty', detail: undefined },
  { label: 'all', type: 'keyword', info: 'Get all records', detail: undefined }
];

const OPERATORS: Completion[] = [
  { label: '=', type: 'operator', info: 'Equal', detail: undefined },
  { label: '!=', type: 'operator', info: 'Not equal', detail: undefined },
  { label: '>', type: 'operator', info: 'Greater than', detail: undefined },
  { label: '<', type: 'operator', info: 'Less than', detail: undefined },
  { label: '>=', type: 'operator', info: 'Greater than or equal', detail: undefined },
  { label: '<=', type: 'operator', info: 'Less than or equal', detail: undefined }
];

/**
 * Extract field path from text (e.g., "user.role.name" -> ["user", "role", "name"])
 */
function extractFieldPath(text: string): string[] {
  const match = text.match(/([\w.]+)\.(\w*)$/);
  if (match) {
    const fullPath = match[1];
    const parts = fullPath.split('.');
    return parts;
  }
  return [];
}

/**
 * Extract schema name from the query
 * Looks backwards from the cursor to find the schema in the current statement
 */
function extractSchema(text: string): string | null {
  const lines = text.split('\n');

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines.slice(0, i + 1).join('\n');
    // Match command + optional quantifier + schema name
    const match = line.match(/\b(\w+)\s+(?:\d+\.\.\d+|\d+[km]?|all)?\s*(\w+)(?:\s+\{.*?\})?\s+where\b/);
    if (match) {
      return match[2];
    }

    const simpleMatch = line.match(/\b(\w+)\s+(?:\d+\.\.\d+|\d+[km]?|all)?\s*(\w+)\s*$/);
    if (simpleMatch && i === lines.length - 1) {
      return simpleMatch[2];
    }
  }

  return null;
}

class MissingRequiredSchema extends Error {
  constructor() {
    super("Expected schema to be read, found none");
    this.name = 'MissingRequiredSchema';
  }
}


class Matcher {
  private config;
  private position: number;
  private textBefore;
  private line;
  private lineText;
  private cursorInLine;
  private textBeforeInLine;
  private schemaName: string | null = null;

  constructor(config: LoupeCompletionConfig, context: CompletionContext) {
    const { state, pos } = context;

    this.config = config
    this.position = pos;
    this.textBefore = state.doc.sliceString(0, pos);
    this.line = state.doc.lineAt(pos);
    this.lineText = this.line.text;
    this.cursorInLine = pos - this.line.from;
    this.textBeforeInLine = this.lineText.slice(0, this.cursorInLine);
  }

  async listCommands() {
    if (/^\s*$/.test(this.textBeforeInLine) || /^\s*\w*$/.test(this.textBeforeInLine)) {
      const commands = await this.config.getCommands();
      return {
        from: this.position - (this.textBeforeInLine.match(/\w+$/)?.[0].length || 0),
        options: commands,
        validFor: /^\w*$/
      };
    }
  }

  async listSchemas() {
    const commandMatch = this.textBeforeInLine.match(/^(\w+)\s+(?:\d+\.\.\d+|\d+[km]?|all)?\s*(\w*)$/);
    if (commandMatch) {
      const command = commandMatch[1];
      const partial = commandMatch[2];
      const schemas = await this.config.getSchemas(command);
      return {
        from: this.position - partial.length,
        options: schemas,
        validFor: /^\w*$/
      };
    }
  }

  async listNestedFields() {
    const schemaName = extractSchema(this.textBefore);
    if (!schemaName) {
      throw new MissingRequiredSchema();
    }

    this.schemaName = schemaName;

    // Check for field path with dots (e.g., "user.role.")
    const fieldPathMatch = this.textBeforeInLine.match(/([\w.]+)\.(\w*)$/);
    console.log({ fieldPathMatch, schemaName })
    if (fieldPathMatch && this.schemaName) {
      const fullPath = fieldPathMatch[1];
      const partial = fieldPathMatch[2];
      const fieldPath = fullPath.split('.');

      const fields = await this.config.getFields({
        schema: this.schemaName,
        fieldPath,
        type: 'field'
      });

      return {
        from: this.position - partial.length,
        options: fields,
        validFor: /^[\w]*$/
      };
    }
  }

  async listFields() {
    if (/\bwhere\s+(\w*)$/.test(this.textBeforeInLine) && this.schemaName) {
      const partial = this.textBeforeInLine.match(/\bwhere\s+(\w*)$/)?.[1] || '';
      const fields = await this.config.getFields({
        schema: this.schemaName,
        fieldPath: [],
        type: 'field'
      });

      return {
        from: this.position - partial.length,
        options: fields,
        validFor: /^[\w]*$/
      };
    }
  }

  async listKeywordOperators() {
    const afterLogicMatch = this.textBeforeInLine.match(/(?:and|or|\()\s+([\w.]*)$/);
    if (afterLogicMatch && this.schemaName) {
      const pathText = afterLogicMatch[1];
      const partial = pathText.split('.').pop() || '';
      const pathParts = pathText.split('.');
      pathParts.pop();

      const fields = await this.config.getFields({
        schema: this.schemaName,
        fieldPath: pathParts.filter((part: string) => part.length > 0),
        type: 'field'
      });

      const allOptions = [...fields, ...KEYWORDS.filter(keyword => ['not'].includes(keyword.label))];

      return {
        from: this.position - partial.length,
        options: allOptions,
        validFor: /^[\w]*$/
      };
    }
  }
  async listOperators() {
    const afterFieldMatch = this.textBeforeInLine.match(/\b([\w.]+)\s+(\S*)$/);
    if (afterFieldMatch && !['where', 'and', 'or', 'not', 'in', 'like', 'all'].includes(afterFieldMatch[1])) {
      const partial = afterFieldMatch[2];
      return {
        from: this.position - partial.length,
        options: [
          ...OPERATORS,
          { label: 'in', type: 'keyword', info: 'Check if value is in list', detail: undefined },
          { label: 'like', type: 'keyword', info: 'Pattern matching', detail: undefined }
        ],
        validFor: /^[=!<>]*$/
      };
    }
  }

  async listKeywords() {
    if (/\bwhere\b/.test(this.textBefore)) {
      const partial = this.textBeforeInLine.match(/\w+$/)?.[0] || '';
      return {
        from: this.position - partial.length,
        options: KEYWORDS.filter(k => !['all'].includes(k.label)),
        validFor: /^\w*$/
      };
    }
  }

  async getCompletion() {
    const RULES = [
      this.listCommands.bind(this),
      this.listSchemas.bind(this),
      this.listNestedFields.bind(this),
      this.listFields.bind(this),
      this.listKeywordOperators.bind(this),
      this.listOperators.bind(this),
      this.listKeywords.bind(this),
    ]

    for (const rule of RULES) {
      try {
        const match = await rule()

        if (match) {
          console.log(rule.name)
          return match
        }
      } catch (error: any) {
        if (error instanceof MissingRequiredSchema) {
          return null
        }
        throw error
      }
    }

    return null
  }
}


/**
 * Creates a Loupe autocompletion source
 */
export function loupeCompletion(config: LoupeCompletionConfig) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const matcher = new Matcher(config, context);

    return await matcher.getCompletion();
  }
}
function __loupeCompletion(config: LoupeCompletionConfig) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const { state, pos } = context;
    const textBefore = state.doc.sliceString(0, pos);
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const cursorInLine = pos - line.from;
    const textBeforeInLine = lineText.slice(0, cursorInLine);

    // Check if we're at the start (command position)
    if (/^\s*$/.test(textBeforeInLine) || /^\s*\w*$/.test(textBeforeInLine)) {
      const commands = await config.getCommands();
      return {
        from: pos - (textBeforeInLine.match(/\w+$/)?.[0].length || 0),
        options: commands,
        validFor: /^\w*$/
      };
    }

    // Check if we're after a command (schema position)
    // Match patterns like "get ", "get 10 ", "get all ", "find 5..10 "
    const commandMatch = textBeforeInLine.match(/^(\w+)\s+(?:\d+\.\.\d+|\d+[km]?|all)?\s*(\w*)$/);
    if (commandMatch) {
      const command = commandMatch[1];
      const partial = commandMatch[2];
      const schemas = await config.getSchemas(command);
      return {
        from: pos - partial.length,
        options: schemas,
        validFor: /^\w*$/
      };
    }

    const schemaName = extractSchema(textBefore);
    if (!schemaName) {
      return null;
    }

    // Check for field path with dots (e.g., "user.role.")
    const fieldPathMatch = textBeforeInLine.match(/([\w.]+)\.(\w*)$/);
    if (fieldPathMatch) {
      const fullPath = fieldPathMatch[1];
      const partial = fieldPathMatch[2];
      const fieldPath = fullPath.split('.');

      const fields = await config.getFields({
        schema: schemaName,
        fieldPath,
        type: 'field'
      });

      return {
        from: pos - partial.length,
        options: fields,
        validFor: /^[\w]*$/
      };
    }

    // Check if we're after "where" (field position)
    if (/\bwhere\s+(\w*)$/.test(textBeforeInLine)) {
      const partial = textBeforeInLine.match(/\bwhere\s+(\w*)$/)?.[1] || '';
      const fields = await config.getFields({
        schema: schemaName,
        fieldPath: [],
        type: 'field'
      });

      return {
        from: pos - partial.length,
        options: fields,
        validFor: /^[\w]*$/
      };
    }

    // Check if we're typing a field name (after "and" or "or" or in parentheses)
    const afterLogicMatch = textBeforeInLine.match(/(?:and|or|\()\s+([\w.]*)$/);
    if (afterLogicMatch) {
      const pathText = afterLogicMatch[1];
      const partial = pathText.split('.').pop() || '';
      const pathParts = pathText.split('.');
      pathParts.pop(); // Remove the partial part

      const fields = await config.getFields({
        schema: schemaName,
        fieldPath: pathParts.filter(p => p.length > 0),
        type: 'field'
      });

      const allOptions = [...fields, ...KEYWORDS.filter(k => ['not'].includes(k.label))];

      return {
        from: pos - partial.length,
        options: allOptions,
        validFor: /^[\w]*$/
      };
    }

    // Check if we're after a field name (operator position)
    const afterFieldMatch = textBeforeInLine.match(/\b([\w.]+)\s+(\S*)$/);
    if (afterFieldMatch && !['where', 'and', 'or', 'not', 'in', 'like', 'all'].includes(afterFieldMatch[1])) {
      const partial = afterFieldMatch[2];
      return {
        from: pos - partial.length,
        options: [...OPERATORS,
        { label: 'in', type: 'keyword', info: 'Check if value is in list', detail: undefined },
        { label: 'like', type: 'keyword', info: 'Pattern matching', detail: undefined }
        ],
        validFor: /^[=!<>]*$/
      };
    }

    // Check if we're in a where clause (keywords and operators)
    if (/\bwhere\b/.test(textBefore)) {
      const partial = textBeforeInLine.match(/\w+$/)?.[0] || '';
      return {
        from: pos - partial.length,
        options: KEYWORDS.filter(k => !['all'].includes(k.label)),
        validFor: /^\w*$/
      };
    }

    return null;
  };
}
