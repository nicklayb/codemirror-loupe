import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';

export interface LoupeCompletionContext {
  command: string;
  schema: string;
  fieldPath: string[];
  type: 'schema' | 'field' | 'operator' | 'keyword' | 'command';
}

export type SchemaProvider = (command: string) => Completion[] | Promise<Completion[]>;

export type FieldProvider = (context: LoupeCompletionContext) => Completion[] | Promise<Completion[]>;

export type CommandProvider = () => Completion[] | Promise<Completion[]>

export type AutocompleteEnabled = (rawText: string) => boolean

export interface LoupeCompletionConfig {
  getCommands: CommandProvider;
  getSchemas: SchemaProvider;
  getFields: FieldProvider;
  startAt: number,
  enabled: AutocompleteEnabled
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

class MissingRequiredCommand extends Error {
  constructor() {
    super("Expected command to be read, found none");
    this.name = 'MissingRequiredCommand';
  }
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
  private startAt;
  private rawText;
  private command: string | null = null;
  private schemaName: string | null = null;

  constructor(config: LoupeCompletionConfig, context: CompletionContext) {
    const { state, pos } = context;
    this.startAt = config.startAt || 0

    this.config = config
    this.position = pos;
    this.rawText = state.doc.toString();
    this.textBefore = state.doc.sliceString(this.startAt, pos);
    this.line = state.doc.lineAt(pos);
    this.lineText = this.line.text.slice(this.startAt);
    this.cursorInLine = pos - this.line.from;
    this.textBeforeInLine = this.lineText.slice(this.startAt, this.cursorInLine);
  }

  extractSchema() {
    const lines = this.textBefore.split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines.slice(0, i + 1).join('\n');
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

  extractCommand() {
    const commandMatch = this.textBefore.match(/^(\w+)\s+/)

    if (commandMatch && commandMatch[1]) {
      return commandMatch[1]
    }
    return null
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
    this.schemaName = this.extractSchema();
    if (!this.schemaName) {
      throw new MissingRequiredSchema();
    }
    this.command = this.extractCommand();
    if (!this.command) {
      throw new MissingRequiredCommand();
    }

    const fieldPathMatch = this.textBeforeInLine.match(/([\w.]+)\.(\w*)$/);
    if (fieldPathMatch && this.schemaName && this.command) {
      const fullPath = fieldPathMatch[1];
      const partial = fieldPathMatch[2];
      const fieldPath = fullPath.split('.');

      const fields = await this.config.getFields({
        command: this.command,
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
    if (/\bwhere\s+(\w*)$/.test(this.textBeforeInLine) && this.schemaName && this.command) {
      const partial = this.textBeforeInLine.match(/\bwhere\s+(\w*)$/)?.[1] || '';
      const fields = await this.config.getFields({
        command: this.command,
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
    if (afterLogicMatch && this.schemaName && this.command) {
      const pathText = afterLogicMatch[1];
      const partial = pathText.split('.').pop() || '';
      const pathParts = pathText.split('.');
      pathParts.pop();

      const fields = await this.config.getFields({
        command: this.command,
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
    const enabled = this.config.enabled || (() => true)
    if (enabled(this.rawText)) {
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
            return match
          }
        } catch (error: any) {
          if (error instanceof MissingRequiredSchema || error instanceof MissingRequiredCommand) {
            return null
          }
          throw error
        }
      }

      return null
    }
    return null
  }
}

export function loupeCompletion(config: LoupeCompletionConfig) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const matcher = new Matcher(config, context);

    return await matcher.getCompletion();
  }
}

