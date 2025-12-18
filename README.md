# CodeMirror Language Support for Loupe

CodeMirror 6 language extension providing syntax highlighting and language support for the [Loupe query language](https://github.com/nicklayb/loupe).

## What is Loupe?

Loupe is a query language for safe and configurable inspection of Ecto schemas in Elixir applications. It provides a declarative syntax for querying data with support for:

- Quantifiers (ranges, multipliers)
- Complex predicates with boolean logic
- Field variants and path binding
- JSON-like parameters
- Safe, configurable schema inspection

## Features

- Full syntax highlighting for Loupe queries
- Automatic code folding for nested structures
- Comment support (`#` line comments)
- Smart indentation
- Built on CodeMirror 6 and Lezer parser

## Installation

```bash
npm install @nicklayb/codemirror-lang-loupe
```

## Usage

### Basic Setup

```typescript
import { EditorView, basicSetup } from 'codemirror';
import { loupe } from '@nicklayb/codemirror-lang-loupe';

new EditorView({
  doc: 'get User where email = "user@example.com"',
  extensions: [basicSetup, loupe()],
  parent: document.querySelector('#editor')
});
```

### With Custom Theme

```typescript
import { EditorView, basicSetup } from 'codemirror';
import { loupe } from '@nicklayb/codemirror-lang-loupe';

new EditorView({
  doc: 'get all Post where status = "published"',
  extensions: [
    basicSetup,
    loupe(),
    EditorView.theme({
      '&': { fontSize: '16px' },
      '.cm-content': { fontFamily: 'Monaco, monospace' }
    })
  ],
  parent: document.querySelector('#editor')
});
```

### With Autocompletion (Callback-Based)

Enable smart, dynamic autocompletion with callback functions. This allows you to provide schemas and fields on-demand, supporting nested field navigation:

```typescript
import { EditorView, basicSetup } from 'codemirror';
import { autocompletion } from '@codemirror/autocomplete';
import { loupe, loupeCompletion } from '@nicklayb/codemirror-lang-loupe';

new EditorView({
  doc: 'get User where ',
  extensions: [
    basicSetup,
    loupe(),
    autocompletion({
      override: [loupeCompletion({
        // Provide available commands
        getCommands: () => [
          { label: 'get', type: 'keyword', info: 'Get records' },
          { label: 'find', type: 'keyword', info: 'Find records' },
          { label: 'fetch', type: 'keyword', info: 'Fetch records' }
        ],

        // Provide available schemas
        getSchemas: () => [
          { label: 'User', type: 'type', info: 'User account' },
          { label: 'Post', type: 'type', info: 'Blog posts' }
        ],

        // Provide fields dynamically based on context
        getFields: (context) => {
          const { schema, fieldPath } = context;

          // Root-level fields
          if (fieldPath.length === 0) {
            if (schema === 'User') {
              return [
                { label: 'id', type: 'property', detail: 'integer' },
                { label: 'email', type: 'property', detail: 'string' },
                { label: 'role', type: 'property', detail: 'Role' }
              ];
            }
          }

          // Nested fields (e.g., after typing "role.")
          if (fieldPath[fieldPath.length - 1] === 'role') {
            return [
              { label: 'name', type: 'property', detail: 'string' },
              { label: 'level', type: 'property', detail: 'integer' }
            ];
          }

          return [];
        }
      })]
    })
  ],
  parent: document.querySelector('#editor')
});
```

**Autocompletion features:**
- **Fully callback-based**: Provide commands, schemas, and fields dynamically at runtime
- **Nested field navigation**: Type dots to navigate nested fields (e.g., `user.role.name`)
- **Context-aware**: The `getFields` callback receives the current schema and field path
- **Async support**: All callbacks can return Promises for fetching data from APIs
- **Command suggestions**: Provided via `getCommands` callback at the beginning
- **Schema suggestions**: Provided via `getSchemas` callback after the command
- **Field suggestions**: Provided via `getFields` callback after `where` and logical operators
- **Operator suggestions**: After field names (=, !=, <, >, <=, >=, in, like)
- **Keyword suggestions**: where, and, or, not, in, like, empty

**Context object passed to `getFields`:**
```typescript
interface LoupeCompletionContext {
  schema: string;        // Current schema (e.g., "User")
  fieldPath: string[];   // Current path (e.g., ["role"] for "role.")
  type: 'field' | ...;   // Type of completion
}
```

## Loupe Query Syntax Examples

### Basic Query
```loupe
get User where email = "user@example.com"
```

### Query with Quantifier
```loupe
get 10 Post where status = "published" and views > 1k
```

### Query with Range
```loupe
get 5..10 Comment where created_at > "2024-01-01"
```

### Query with Parameters
```loupe
get Article {title: "Hello", draft: false} where author_id = user_id
```

### Complex Query with Nested Conditions
```loupe
get all Transaction where
  (amount >= 100 and amount <= 1000) or
  status = "pending"
```

### Query with IN Operator
```loupe
get User where role in ["admin", "moderator"]
```

### Query with LIKE Operator
```loupe
get Product where name like "iPhone"
```

### Query with Field Variant
```loupe
get Account where balance:amount >= 10k
```

### Query with Path Binding
```loupe
get User where role.permissions[posts, access] = "write"
```

### Grouped Field OR (`|`)
```loupe
get Post where title | description like "search term"
```
The `|` operator checks if **any** of the grouped fields match the condition.

### Grouped Field AND (`&`)
```loupe
get Product where price & discount > 100
```
The `&` operator checks if **all** of the grouped fields match the condition.

### Query with NOT and EMPTY
```loupe
get Document where not status:empty and published = true
```

## Development

### Prerequisites

- Node.js 20 or later
- npm or pnpm

### Setup with Nix (Recommended)

If you have Nix with flakes enabled:

```bash
nix develop
npm install
npm run build
```

### Manual Setup

```bash
npm install
npm run build
```

### Available Scripts

- `npm run build:parser` - Generate the Lezer parser from grammar
- `npm run build` - Build the library (runs parser generation + rollup)
- `npm run dev` - Run the example app in development mode

### Project Structure

```
loupejs/
├── src/
│   ├── grammar.lezer    # Lezer grammar definition
│   ├── highlight.ts     # Syntax highlighting rules
│   └── index.ts         # Main entry point
├── example/
│   ├── index.html       # Example app HTML
│   └── main.js          # Example app code
├── dist/                # Build output
├── flake.nix            # Nix development environment
├── package.json
├── tsconfig.json
└── rollup.config.js
```

## Running the Example

To see the language support in action:

```bash
npm run dev
```

Then open your browser to the URL shown (typically http://localhost:5173 or http://localhost:5174).

**Important**: You must access the example through the Vite dev server URL. Opening the HTML file directly (file://) won't work because ES modules with bare imports require a development server to resolve properly.

## Building from Source

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the parser: `npm run build:parser`
4. Build the library: `npm run build`

The compiled library will be in the `dist/` directory.

## Language Features

### Supported Tokens

- **Commands**: Any identifier (e.g., `get`, `find`, `fetch`)
- **Keywords**: `where`, `all`, `in`, `like`, `empty`, `and`, `or`, `not`
- **Comparison Operators**: `=`, `!=`, `<`, `>`, `<=`, `>=`
- **Grouped Field Operators**: `|` (OR for fields), `&` (AND for fields)
- **Boolean Operators**: `and`, `or`, `not`
- **Quantifiers**: Numbers, ranges (`1..10`), multipliers (`k`, `m`)
- **Values**: Strings, numbers, booleans, identifiers
- **Structures**: Parameters `{key: value}`, lists `[value1, value2]`
- **Advanced**: Field variants (`:variant`), path binding (`[field1, field2]`)
- **Comments**: Line comments starting with `#`

**Note**: The `|` and `&` operators are for grouping fields (e.g., `field1 | field2 = "value"`), while `and`/`or` are for combining predicates (e.g., `field1 = "a" and field2 = "b"`).

### Syntax Highlighting

The extension provides semantic highlighting for:

- Keywords (purple/blue)
- Operators (red/orange)
- Strings (green)
- Numbers (blue)
- Comments (gray)
- Identifiers and schema names
- Field variants and path bindings

## License

MIT

## Related Projects

- [Loupe](https://github.com/nicklayb/loupe) - The Loupe query language for Elixir
- [CodeMirror 6](https://codemirror.net/) - Extensible code editor
- [Lezer](https://lezer.codemirror.net/) - Incremental parser system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Nicolas Boisvert

## Acknowledgments

Built with CodeMirror 6 and Lezer parser generator.
