import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { KeyVaultService } from "../services/keyVault.service";
import { GoogleClientSecret } from "../models";
import { config } from "../config";
import { GmailService } from "../services/gmail.service";

export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const googleClientSecret = await KeyVaultService.getSecretAsObject<GoogleClientSecret>(config.GMAIL_OATH_KEY_NAME);
  const authURL = await GmailService.generateAuthUrl(googleClientSecret);

  return { status: 200, body: authURL };
}

app.http("generateAuthURL", {
  methods: ["GET"],
  authLevel: "function",
  handler: httpTrigger,
});
