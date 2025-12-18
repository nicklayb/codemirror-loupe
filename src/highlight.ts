import { styleTags, tags as t } from '@lezer/highlight';

export const loupeHighlighting = styleTags({
  'where all in like empty and or not': t.keyword,
  Command: t.keyword,
  Identifier: t.variableName,
  Schema: t.typeName,
  String: t.string,
  Number: t.number,
  Boolean: t.bool,
  Comment: t.lineComment,
  'ComparisonOp InOp LikeOp': t.compareOperator,
  'and or': t.logicOperator,
  'not': t.operatorKeyword,
  GroupedOp: t.separator,
  '( )': t.paren,
  '[ ]': t.squareBracket,
  '{ }': t.brace,
  ':': t.punctuation,
  ',': t.separator,
  '.': t.derefOperator,
  '..': t.operator,
  '|': t.separator,
  '&': t.separator,
  'multiplierK multiplierM': t.unit,
  FieldVariant: t.modifier,
  PathBinding: t.special(t.propertyName)
});
