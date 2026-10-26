// Lists the components and tokens available in a base schema.
// Usage: npm run tokens -- [component[.variant]] [--base material] [--variant light]
import * as sass from 'sass';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { base: { type: 'string', default: 'material' }, variant: { type: 'string', default: 'light' } },
});

const [component, sub] = (positionals[0] ?? '').split('.');
const schema = `schemas.$${values.variant}-${values.base}-schema`;
const target = component ? `map.get(${schema}, '${component}'${sub ? `, '${sub}'` : ''})` : schema;

const src = `
@use 'sass:map';
@use 'sass:meta';
@use 'igniteui-theming/sass/themes/schemas' as schemas;
$node: ${target};
@if not $node { @error 'Unknown component "${positionals[0]}"'; }
@each $key, $value in map.remove($node, '_meta', 'selector') {
  @if ${component ? 'true' : 'false'} or meta.type-of($value) != 'map' or map.has-key($value, '_meta') {
    @debug '#{$key}: #{if(${component ? 'true' : 'false'}, meta.inspect($value), '')}';
  } @else {
    @debug '#{$key}: (variants: #{map.keys($value)})';
  }
}
`;

sass.compileString(src, {
  loadPaths: ['node_modules'],
  logger: { warn() {}, debug: (m) => console.log(m) },
});
