import type { ImageOutputFormat } from 'astro';

/**
 * Shared output formats for astro:assets. Declared once and typed, because a bare
 * `['avif','webp']` literal infers as `string[]` and will not satisfy the Image props.
 */
export const FORMATS = ['avif', 'webp'] satisfies ImageOutputFormat[];
