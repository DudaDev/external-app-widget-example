export interface FetchState<T> {
  data: T | undefined;
  error: unknown;
  requested: boolean;
}

export type FetchAction<T> =
  | { type: 'FETCH_REQUEST' }
  | { type: 'FETCH_FAILURE'; error: unknown }
  | { type: 'FETCH_SUCCESS'; data: T };

export function createFetchReducer<T>() {
  return function fetchReducer(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
    switch (action.type) {
      case 'FETCH_REQUEST':
        return { data: undefined, error: undefined, requested: true };
      case 'FETCH_FAILURE':
        return { ...state, data: undefined, error: action.error };
      case 'FETCH_SUCCESS':
        return { ...state, data: action.data, error: undefined };
      default:
        throw new Error('Unknown fetch action');
    }
  };
}
