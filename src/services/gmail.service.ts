import { Auth, google } from 'googleapis';
import { GoogleClientSecret, RuleType } from '../models';
import { KeyVaultService } from './keyVault.service';
import { config } from '../config';
import { GmailJobRuleBaseDTO, GmailJobRuleDTO, GmailJobRuleGroupDTO } from '../dtos/GmailJobFilterDTO';
import { GmailJobAction, GmailJobDTO } from '../dtos/GmailJobDTO';
import { GmailJobLog } from '../models/GmailJobLog';
import { GmailJobService } from './gmailJob.service';
import { randomUUID } from 'crypto';

export class GmailService {
  static oAuth2ClientMap: Record<string, { oAuth2Client: Auth.OAuth2Client; tokens: Auth.Credentials }> = {};

  constructor() {}

  static getAuthTokenFromCode = async (code: string): Promise<Auth.Credentials> => {
    throw new Error('Not Implemented');
    // const tokenResponse = await this.oauth2Client.getToken(code);
    // return tokenResponse.tokens;
  };

  static generateAuthUrl = async (clientSecret: GoogleClientSecret): Promise<string> => {
    const { client_id, client_secret, redirect_uris } = clientSecret.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    return oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'],
    });
  };

  static getGoogleAuthClient = async (userId: string): Promise<Auth.OAuth2Client> => {
    if (userId in this.oAuth2ClientMap) return this.oAuth2ClientMap[userId].oAuth2Client;
    const googleClientSecret = await KeyVaultService.getSecretAsObject<GoogleClientSecret>(config.GMAIL_OATH_KEY_NAME);
    const googleAuthToken = await KeyVaultService.getSecretAsObject<Auth.Credentials>(`${config.GMAIL_AUTH_TOKEN_NAME}-${userId}`);

    const { client_id, client_secret, redirect_uris } = googleClientSecret.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const newAuthTokens = await GmailService.authenticateGoogleAPI(oAuth2Client, Object.assign({}, googleAuthToken));
    await KeyVaultService.setSecret(`${config.GMAIL_AUTH_TOKEN_NAME}-${userId}`, JSON.stringify(newAuthTokens));
    this.oAuth2ClientMap[userId] = { oAuth2Client, tokens: newAuthTokens };
    return oAuth2Client;
  };

  static getMessageIdsByQuery = async (userId: string, query: string): Promise<string[]> => {
    const oauth2Client = await GmailService.getGoogleAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    let nextPageToken: string | undefined;
    const messageIds: string[] = [];
    do {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        pageToken: nextPageToken,
      });

      const messages = res.data.messages;
      if (messages) {
        messageIds.push(...messages.map(x => x.id));
      }

      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    return messageIds;
  };

  static formatLabel = (label: string) => {
    if (!label) return '';
    return label.toLocaleLowerCase().replace(/\s/g, '-');
  };

  static parseRule = (rule: GmailJobRuleBaseDTO, depth: number = -1): string => {
    depth++;
    if (rule.type === RuleType.Group) {
      const groupRule = rule as GmailJobRuleGroupDTO;
      const groupRules = groupRule.rules.map(rule => GmailService.parseRule(rule, depth));
      const parsedGroupRule = groupRules.join(` ${groupRule.operator} `);
      return depth === 0 ? parsedGroupRule : `{${parsedGroupRule}}`;
    }
    const filterRule = rule as GmailJobRuleDTO;
    return `${filterRule.operator}:${GmailService.formatLabel(filterRule.value)}`;
  };

  static archiveMessages = async (messageIds: string[], userId: string): Promise<number> => {
    if (messageIds.length === 0) return 0;
    const oauth2Client = await GmailService.getGoogleAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: messageIds,
        removeLabelIds: ['INBOX'],
      },
    });
    return messageIds.length;
  };

  static processJob = async (job: GmailJobDTO, userId: string): Promise<void> => {
    const action = job.action;
    const rootRule = job.rules[0];
    const parsedRules = GmailService.parseRule(rootRule);
    let ruleQuery = '';
    let affectedMessages: number = 0;
    if (action === GmailJobAction.Archive) {
      ruleQuery = `label:inbox AND {${parsedRules}}`;
      const messageIds = await GmailService.getMessageIdsByQuery(userId, ruleQuery);
      affectedMessages = await GmailService.archiveMessages(messageIds, userId);
    }

    const jobLog = new GmailJobLog({
      partitionKey: userId,
      rowKey: randomUUID(),
      date: { type: 'DateTime', value: new Date().toISOString() },
      jobName: job.name,
      count: affectedMessages,
      filter: ruleQuery,
    });
    await GmailJobService.storeJobResults(jobLog);
  };

  private static authenticateGoogleAPI = async (oAuth2Client: Auth.OAuth2Client, authTokens: Auth.Credentials): Promise<Auth.Credentials> => {
    return new Promise((res, rej) => {
      oAuth2Client.on('tokens', async newTokens => {
        try {
          if (newTokens.refresh_token) {
            authTokens.refresh_token = newTokens.refresh_token;
          }
          authTokens.access_token = newTokens.access_token;
          res(authTokens);
        } catch (error) {
          rej(error);
        }
      });

      oAuth2Client.setCredentials(authTokens);

      oAuth2Client
        .getAccessToken()
        .then(({ token }) => {
          if (token) {
            authTokens.access_token = token;
          }
          res(authTokens);
        })
        .catch(rej);
    });
  };
}
