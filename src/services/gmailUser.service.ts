import { TableClient, TableEntityResult } from '@azure/data-tables';
import { GmailUser } from '../models/GmailUser';

export class GmailUserService {
  constructor() {}

  static async getUsers(): Promise<TableEntityResult<GmailUser>[]> {
    const gmailUsersClient = await this.getGmailUsersTableClient();
    const usersRequest = gmailUsersClient.listEntities<GmailUser>({queryOptions: {filter: 'PartitionKey eq "gmailUser" AND isActive eq true'}});
    const users: TableEntityResult<GmailUser>[] = [];
    for await (const user of usersRequest) {
      users.push(user);
    }
    return users;
  }

  private static getGmailUsersTableClient = async () => {
    const connectionString = 'UseDevelopmentStorage=true';
    const gmailJobsClient = TableClient.fromConnectionString(connectionString, 'gmailUsers');
    await gmailJobsClient.createTable();
    return gmailJobsClient;
  };
}
