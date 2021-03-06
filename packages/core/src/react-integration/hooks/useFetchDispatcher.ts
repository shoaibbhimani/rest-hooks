import {
  FetchShape,
  SchemaFromShape,
  ParamsFromShape,
  BodyFromShape,
  OptimisticUpdateParams,
  ReturnFromShape,
} from '@rest-hooks/core/endpoint';
import { Schema } from '@rest-hooks/normalizr';
import { DispatchContext } from '@rest-hooks/core/react-integration/context';
import createFetch from '@rest-hooks/core/state/actions/createFetch';
import { useContext, useCallback } from 'react';

type IfExact<T, Cond, A, B> = Cond extends T ? (T extends Cond ? A : B) : B;

/** Build an imperative dispatcher to issue network requests. */
export default function useFetchDispatcher(
  throttle = false,
): <
  Shape extends FetchShape<Schema, Readonly<object>, any>,
  UpdateParams extends OptimisticUpdateParams<
    SchemaFromShape<Shape>,
    FetchShape<any, any, any>
  >[]
>(
  fetchShape: Shape,
  params: ParamsFromShape<Shape>,
  body: BodyFromShape<Shape>,
  updateParams?: UpdateParams | undefined,
) => ReturnFromShape<typeof fetchShape> {
  const dispatch = useContext(DispatchContext);

  const fetchDispatcher = useCallback(
    <Shape extends FetchShape<Schema, Readonly<object>, any>>(
      fetchShape: Shape,
      params: ParamsFromShape<Shape>,
      body: BodyFromShape<Shape>,
      updateParams?:
        | OptimisticUpdateParams<
            SchemaFromShape<Shape>,
            FetchShape<any, any, any>
          >[]
        | undefined,
    ) => {
      const action = createFetch(fetchShape, {
        params,
        body,
        throttle,
        updateParams,
      });
      dispatch(action);
      return action.meta.promise;
    },
    [dispatch, throttle],
  );
  // any is due to the ternary that we don't want to deal with in our implementation
  return fetchDispatcher as any;
}
