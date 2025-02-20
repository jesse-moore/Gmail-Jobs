import { Auth, google } from "googleapis";
import { GoogleClientSecret } from "../models";

export class GmailService {
  static oauth2Client: Auth.OAuth2Client;

  constructor() {}

  static getAuthTokenFromCode = async (code: string): Promise<Auth.Credentials> => {
    const tokenResponse = await this.oauth2Client.getToken(code);
    return tokenResponse.tokens;
  };

  static generateAuthUrl = async (clientSecret: GoogleClientSecret): Promise<string> => {
    const { client_id, client_secret, redirect_uris } = clientSecret.installed;
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.modify"],
    });
  };

  static authenticateGoogleAPI = async (
    clientSecret: GoogleClientSecret,
    authTokens: Auth.Credentials
  ): Promise<{ oauth2Client: Auth.OAuth2Client; tokens: Auth.Credentials }> => {
    return new Promise((res, rej) => {
      const tokens = Object.assign({}, authTokens);
      const { client_id, client_secret, redirect_uris } = clientSecret.installed;

      this.oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      this.oauth2Client.on("tokens", async (newTokens) => {
        try {
          if (newTokens.refresh_token) {
            tokens.refresh_token = newTokens.refresh_token;
          }
          tokens.access_token = newTokens.access_token;
          res({ oauth2Client: this.oauth2Client, tokens });
        } catch (error) {
          rej(error);
        }
      });

      this.oauth2Client.setCredentials(tokens);

      this.oauth2Client
        .getAccessToken()
        .then(({ token }) => {
          if (token) {
            tokens.access_token = token;
          }
          res({ oauth2Client: this.oauth2Client, tokens });
        })
        .catch(rej);
    });
  };
}
