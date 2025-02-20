const keyVaultName = process.env["KEY_VAULT_NAME"];

export const config = {
  KEY_VAULT_NAME: keyVaultName,
  GMAIL_OATH_KEY_NAME: process.env["GMAIL_OAUTH_KEY_NAME"],
  GMAIL_AUTH_TOKEN_NAME: process.env["GMAIL_AUTH_TOKEN_NAME"],
  KEY_VALUE_URI: `https://${keyVaultName}.vault.azure.net/`,
};

Object.entries(config).forEach(([key, value]) => {
  if (!value) throw new Error(`Environment Variable ${key} not set.`);
});
