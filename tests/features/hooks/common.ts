export interface TestHooks {
    onEvent: (payload: { value: number }) => void | Promise<void>
}
