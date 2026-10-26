import { DOCUMENTATION_HOSTS } from '../constants/DocumentationHosts.ts';

export const isDocumentationHost = (host: string): boolean =>
  DOCUMENTATION_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
