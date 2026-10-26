export const SECRET_FILE_NAME =
  /^(\.env.*|[._]netrc|\.npmrc|\.pypirc|\.git-credentials|\.pgpass|id_(rsa|dsa|ecdsa|ed25519)|.+\.(pem|key|p12|pfx|jks|keystore))$/i;

export const SECRET_DIRECTORY =
  /(^|\/)\.(ssh|aws|gnupg|azure|kube)(\/|$)|\/\.config\/(gh|gcloud)(\/|$)|\/\.docker\/config\.json$/;

export const SECRET_TEMPLATE_NAME = /\.(example|sample|template|dist)$/i;
