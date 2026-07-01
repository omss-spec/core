export type Result<T, E> =
    | {
          data: T
          error: null
      }
    | {
          data: null
          error: E
      }
