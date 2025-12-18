import { EditorView, basicSetup } from 'codemirror';
import { autocompletion } from '@codemirror/autocomplete';
import { loupe, loupeCompletion } from '../src/index.ts';

const SCHEMAS = {
  User: {
    info: 'User accounts',
    fields: [
      { label: 'id', type: 'property', detail: 'integer', info: 'User ID' },
      { label: 'email', type: 'property', detail: 'string', info: 'User email address' },
      { label: 'name', type: 'property', detail: 'string', info: 'User full name' },
      { label: 'role', type: 'property', detail: 'Role', info: 'User role (association)' },
      { label: 'status', type: 'property', detail: 'string', info: 'Account status' },
      { label: 'created_at', type: 'property', detail: 'datetime', info: 'Account creation date' }
    ]
  },
  Role: {
    info: 'User access role',
    fields: [
      { label: 'name', type: 'property', detail: 'string', info: 'Role name' },
      { label: 'permissions', type: 'property', detail: 'array', info: 'Role permissions' },
      { label: 'level', type: 'property', detail: 'integer', info: 'Permission level' }
    ]
  },
  Post: {
    info: 'Blog post or article',
    fields: [
      { label: 'id', type: 'property', detail: 'integer', info: 'Post ID' },
      { label: 'title', type: 'property', detail: 'string', info: 'Post title' },
      { label: 'content', type: 'property', detail: 'text', info: 'Post content' },
      { label: 'author', type: 'property', detail: 'User', info: 'Post author (belongs to User)' },
      { label: 'published_at', type: 'property', detail: 'datetime', info: 'Publication date' }
    ]
  },
  Transaction: {
    info: 'Financial transaction',
    fields: [
      { label: 'id', type: 'property', detail: 'integer', info: 'Transaction ID' },
      { label: 'amount', type: 'property', detail: 'decimal', info: 'Transaction amount' },
      { label: 'status', type: 'property', detail: 'string', info: 'Transaction status' },
      { label: 'user', type: 'property', detail: 'User', info: 'Transaction user (belongs to User)' }
    ]
  }
};

const FIELD_ASSOCIATIONS = {
  author: 'User',
  user: 'User',
  role: 'Role'
};

const COMMANDS = [
  { label: 'get', type: 'keyword', info: 'Get records' },
  { label: 'find', type: 'keyword', info: 'Find records' },
  { label: 'fetch', type: 'keyword', info: 'Fetch records' },
  { label: 'list', type: 'keyword', info: 'List records' },
  { label: 'search', type: 'keyword', info: 'Search records' }
]
const AVAILABLE_SCHEMAS = Object.entries(SCHEMAS).map(([key, { info }]) => ({
  label: key, type: 'type', info
}))

const getFields = (schemaKey) => {
  const schema = SCHEMAS[schemaKey]
  if (schema) {
    return schema.fields
  }
  return []
}

const sampleQuery = `# Loupe Query Language Example with Schema Associations
# Both Post.author and Transaction.user reference the User schema!

# get User where role.name = "admin" and role.level > 5

# Post.author references User schema
# get Post where author.email like "company.com" and author.status = "active" and title like "Introduction"

# Transaction.user also references User schema (same fields as author!)
# get Transaction where user.email = "admin@company.com" and user.role.name = "admin" and amount > 1000

# Try typing with dots to see associations:
# - "get Post where author." - see User fields
# - "get Transaction where user." - see same User fields
# - "get User where role." - see Role fields
`;
console.log(loupe())
new EditorView({
  doc: sampleQuery,
  extensions: [
    basicSetup,
    loupe(),
    autocompletion({
      override: [loupeCompletion({
        getCommands: () => COMMANDS,

        getSchemas: () => AVAILABLE_SCHEMAS,

        getFields: (context) => {
          const { schema, fieldPath } = context;
          console.log(context)

          if (fieldPath.length === 0) {
            return getFields(schema)
          }

          const lastField = fieldPath[fieldPath.length - 1];

          const associatedSchema = FIELD_ASSOCIATIONS[lastField];

          if (associatedSchema) {
            return getFields(associatedSchema)
          }

          return [];
        }
      })]
    }),
    EditorView.theme({
      '&': {
        fontSize: '16px',
        height: '100%'
      },
      '.cm-content': {
        fontFamily: "'Monaco', 'Courier New', monospace",
        padding: '1rem'
      },
      '.cm-gutters': {
        backgroundColor: '#f8fafc',
        borderRight: '1px solid #e2e8f0'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#f1f5f9'
      },
      '.cm-activeLine': {
        backgroundColor: '#f8fafc'
      }
    })
  ],
  parent: document.querySelector('#editor')
});
