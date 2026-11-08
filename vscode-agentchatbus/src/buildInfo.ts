// Fork build identity, injected at bundle time by scripts/build-extension.mjs via esbuild `define`.
// Lets a locally built VSIX be told apart from the marketplace release that shares its version.
declare const __ACB_BUILD_INFO__: { commit: string; branch: string; dirty: boolean } | undefined;

/** e.g. "dev@016d353" or "dev@016d353+dirty"; empty when built without git info. */
export function getBuildLabel(): string {
    const info = typeof __ACB_BUILD_INFO__ !== 'undefined' ? __ACB_BUILD_INFO__ : undefined;
    if (!info || !info.commit) {
        return '';
    }
    return `${info.branch || 'detached'}@${info.commit}${info.dirty ? '+dirty' : ''}`;
}

/** Appends the build label to a version string, e.g. "0.2.46 (dev@016d353)". */
export function withBuildLabel(version: string): string {
    const label = getBuildLabel();
    return label ? `${version} (${label})` : version;
}
