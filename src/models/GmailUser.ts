import { TableEntity } from "@azure/data-tables";

export class GmailUser implements TableEntity {
  partitionKey: string;
  rowKey: string;
  isActive: boolean;
  [x: string]: unknown;

  constructor(data: Partial<GmailUser>) {
    this.partitionKey = data?.partitionKey;
    this.rowKey = data?.rowKey;
    this.isActive = data?.isActive;
  }

  toEntity(): TableEntity {
    return {
      partitionKey: this.partitionKey,
      rowKey: this.rowKey,
      isActive: {
        type: "Boolean",
        value: this.isActive,
      }
    };
  }
}
