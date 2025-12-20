import { EditorView, minimalSetup } from 'codemirror';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { loupe, loupeCompletion, toCodemirrorFields } from '../src/index.ts';

const SCHEMAS = {
  User: {
    info: 'User accounts',
    fieldSet: {
      associations: {
        role: 'Role',
        posts: 'Post',
        transactions: 'Transaction'
      },
      fields: ['id', 'email', 'name', 'role', 'status', 'created_at']
    }
  },
  Role: {
    info: 'User access role',
    fieldSet: {
      associations: {},
      fields: ['name', 'permissions', 'level']
    }
  },
  Post: {
    info: 'Blog post or article',
    fieldSet: {
      associations: {
        author: 'User'
      },
      fields: ['id', 'title', 'content', 'author', 'published_at']
    }
  },
  Transaction: {
    info: 'Financial transaction',
    fieldSet: {
      associations: {
        user: 'User'
      },
      fields: ['id', 'amount', 'status']
    }
  }
};

const COMMANDS = [
  { label: 'get', type: 'enum', info: 'Get records' },
  { label: 'find', type: 'enum', info: 'Find records' },
  { label: 'fetch', type: 'enum', info: 'Fetch records' },
  { label: 'list', type: 'enum', info: 'List records' },
  { label: 'search', type: 'enum', info: 'Search records' }
]//.map((command) => ({ ...command, label: `'${command.label}` }))

const AVAILABLE_SCHEMAS = Object.entries(SCHEMAS).map(([key, { info }]) => ({
  label: key, type: 'type', info
}))

const getFields = (schemaKey, fieldPath) => {
  const fieldSet = fieldPath.reduce((acc, field) => {
    const childSchema = acc.associations[field]
    const childFieldSet = SCHEMAS[childSchema]

    if (childFieldSet) {
      return childFieldSet.fieldSet
    }

    return { associations: {}, fields: [] }
  }, SCHEMAS[schemaKey].fieldSet)

  return toCodemirrorFields(fieldSet)
}

const view = new EditorView({
  doc: '',
  extensions: [
    minimalSetup,
    loupe(),
    autocompletion({
      override: [loupeCompletion({
        getCommands: () => COMMANDS,

        getSchemas: () => AVAILABLE_SCHEMAS,

        getFields: (context) => {
          const { schema, fieldPath } = context;

          return getFields(schema, fieldPath)
        },

        startAt: 1,

        enabled: (rawText) => rawText.startsWith("'")
      })],

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
    }),

    closeBrackets(),
  ],
  parent: document.querySelector('#editor')
});

Array.from(document.querySelectorAll(".example")).forEach(element => {
  element.addEventListener('click', (event) => {
    console.log(event.target.parentElement)
    const body = event.target.parentElement.querySelector(".example-body")
    const content = body.innerText

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content
      }
    })
  })
})

