import { CODE_EXTENSIONS, CONFIG_EXTENSIONS } from '../constants/FileExtensions.js';
                                                     

export const fileKindOf = (extension        )           =>
  CODE_EXTENSIONS.has(extension) ? 'code' : CONFIG_EXTENSIONS.has(extension) ? 'config' : 'prose';
