import { DefaultAzureCredential } from "@azure/identity";
import { KeyVaultSecret, SecretClient } from "@azure/keyvault-secrets";
import { config } from "../config";

export class KeyVaultService {
  private static client = new SecretClient(config.KEY_VALUE_URI, new DefaultAzureCredential());

  static async getSecretAsString(keyName: string): Promise<string | undefined> {
    try {
      const secret = await this.client.getSecret(keyName);
      return secret.value;
    } catch (error) {
      return undefined;
    }
  }

  static async getSecretAsObject<T>(keyName: string): Promise<T | undefined> {
    const secretString = await this.getSecretAsString(keyName);
    return secretString ? (JSON.parse(secretString) as T) : undefined;
  }

  static async setSecret(keyName: string, value: string): Promise<KeyVaultSecret> {
    return await this.client.setSecret(keyName, value);
  }
}
