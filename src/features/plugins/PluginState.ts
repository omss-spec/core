/**
 * The lifecycle states a plugin can be in, as tracked by {@link PluginRegistry}.
 */
export enum PluginState {
    /**
     * The plugin's registration function is currently executing.
     */
    Registering,
    /**
     * The plugin has finished executing and was registered successfully.
     */
    Registered,
    /**
     * The plugin was never registered, or its registration failed.
     */
    Unavailable,
}
