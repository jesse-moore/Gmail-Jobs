import { TableEntity } from '@azure/data-tables';
import { TableEntityProperty } from '.';

export class GmailJobLog implements TableEntity {
  partitionKey: string;
  rowKey: string;
  date: TableEntityProperty<string | null>;
  jobName: string;
  count: number;
  filter: string;
  [x: string]: unknown;

  constructor(data: Partial<GmailJobLog>) {
    this.partitionKey = data?.partitionKey;
    this.rowKey = data?.rowKey;
    this.date = data?.date ? { type: 'DateTime', value: data.date.value } : null;
    this.jobName = data?.jobName;
    this.count = data?.count;
    this.filter = data?.filter;
  }

  toEntity(): TableEntity {
    return {
      partitionKey: this.partitionKey,
      rowKey: this.rowKey,
      date: this.date,
      jobName: {
        type: 'String',
        value: this.jobName,
      },
      count: {
        type: 'Int32',
        value: this.count,
      },
      filter: {
        type: 'String',
        value: this.filter,
      },
    };
  }
}
