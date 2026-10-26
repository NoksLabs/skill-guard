import { CODE_EXTENSIONS, CONFIG_EXTENSIONS } from '../constants/FileExtensions.ts';
import type { FileKind } from '../types/FileKind.ts';

export const fileKindOf = (extension: string): FileKind =>
  CODE_EXTENSIONS.has(extension) ? 'code' : CONFIG_EXTENSIONS.has(extension) ? 'config' : 'prose';
