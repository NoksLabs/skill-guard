import { DOCUMENTATION_HOSTS } from '../constants/DocumentationHosts.js';

export const isDocumentationHost = (host        )          =>
  DOCUMENTATION_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
