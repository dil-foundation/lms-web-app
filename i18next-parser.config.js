module.exports = {
  contextSeparator: '_',
  // Key separator used in your translation keys

  createOldCatalogs: true,
  // Save the \`_old\` catalogs

  defaultNamespace: 'translation',
  // Default namespace used in your i18next config

  defaultValue: '',
  // Default value to give to empty keys

  indentation: 2,
  // Indentation of the catalog files

  keepRemoved: false,
  // Keep keys from the catalog that are no longer in code

  keySeparator: '.',
  // Key separator used in your translation keys
  // If you want to use plain english keys, separators such as `.` and `:` will conflict. You might want to set `keySeparator: false` and `namespaceSeparator: false`. That way, `t('Status: ' + status)` will resolve to `"Status: "` and not to `{"Status:": "Laden..."}`.

  lexers: {
    js: ['JsxLexer'], // we're writing jsx inside ALL /src files
    ts: ['JsxLexer'],
    tsx: ['JsxLexer'],

    default: ['JsxLexer'],
  },

  lineEnding: 'auto',
  // Control the line ending. See https://www.npmjs.com/package/line-endings

  locales: ['en', 'ur'],
  // An array of the locales in your project

  namespaceSeparator: ':',
  // Namespace separator used in your translation keys
  // If you want to use plain english keys, separators such as `.` and `:` will conflict. You might want to set `keySeparator: false` and `namespaceSeparator: false`. That way, `t('Status: ' + status)` will resolve to `"Status: "` and not to `{"Status:": "Laden..."}`.

  output: 'public/locales/$LOCALE/$NAMESPACE.json',
  // Supports $LOCALE and $NAMESPACE injection
  // Supports JSON (.json) and YAML (.yml) file formats
  // Where to write the locale files relative to process.cwd()

  input: [
    'src/**/*.{js,jsx,ts,tsx}'
  ],
  // An array of globs that describe where to look for source files
  // relative to the location of the configuration file

  resetDefaultValueLocale: null,
  // The locale to compare with default values to determine whether to reset the default value

  sort: false,
  // Whether to sort the catalog

  useKeysAsDefaultValue: false,
  // Whether to use the keys as the default value; ex. "Hello": "Hello"
  // This option takes precedence over the `defaultValue` and `resetDefaultValueLocale` options

  verbose: false,
  // Watch for changes and rerun nodes generation on saving
}; 