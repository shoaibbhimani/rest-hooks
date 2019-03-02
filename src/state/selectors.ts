import { createSelector } from 'reselect';
import { memoize } from 'lodash';
import { State } from '../types';
import { isEntity, SchemaOf } from '../resource/types';
import { Schema, denormalize } from '../resource/normal';
import getEntityPath from './getEntityPath';

export function selectMeta<R = any>(state: State<R>, url: string) {
  return state.meta[url];
}

export const makeResults = <R = any>(getUrl: (...args: any[]) => string) => (
  state: State<R>,
  params: object
) => state.results[getUrl(params)] || null;

// TODO: there should honestly be a way to use the pre-existing normalizr object
// to not even need this implementation
function resultFinderFromSchema<S extends Schema>(schema: S): null | ((results: any) => SchemaOf<S>)
{
  const path = getEntityPath(schema);
  if (path === false) throw new Error('Schema invalid - no path to entity found');
  if (path.length === 0) return null;
  return (results) => {
    let cur = results;
    for(const p of path) {
      cur = cur[p];
    }
    return cur;
  }
}

function makeSchemaSelectorSimple<
Params extends Readonly<object>,
S extends Schema
>(
  schema: S,
  getUrl: (params: Params) => string,
): (state: State<any>, params: Params) => SchemaOf<typeof schema> | null {
  const getResultList = resultFinderFromSchema(schema);
  const selectResults = makeResults<any>(getUrl);
  const ret = createSelector(
    (state: State<any>) => state.entities,
    selectResults,
    (state: State<any>, params: Params) => params,
    (entities, results, params: Params) => {
      // We can grab entities without actual results if the params compute a primary key
      if (isEntity(schema) && !results) {
        const id = schema.getId(params, undefined, '');
        // in case we don't even have entities for a model yet, denormalize() will throw
        if (
          id !== undefined &&
          id !== '' &&
          entities[schema.key] !== undefined
        ) {
          results = id;
        }
      }
      if (!entities || !results) return null;
      if (process.env.NODE_ENV !== 'production' && isEntity(schema)) {
        if (Array.isArray(results)) {
          throw new Error(
            `url ${getUrl(
              params
            )} has list results when single result is expected`
          );
        }
        if (typeof results === 'object') {
          throw new Error(
            `url ${getUrl(
              params
            )} has object results when single result is expected`
          );
        }
      }
      let output = denormalize(results, schema, entities);
      if (getResultList) {
        output = getResultList(output);
      }
      if (!output) return null;
      if (process.env.NODE_ENV !== 'production' && !Array.isArray(output)) {
        // this is the immutable.js look-alike hack
        if (!output.__ownerID) {
          throw new Error(`wrong type found : ${output}`);
        }
      }
      if (Array.isArray(output)) {
        output = output.filter(entity => entity);
      }
      return output;
    }
  );
  return ret;
}

export const makeSchemaSelector = memoize(makeSchemaSelectorSimple) as typeof makeSchemaSelectorSimple;
