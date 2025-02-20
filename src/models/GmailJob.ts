import { AutoMap } from "@automapper/classes";
import { TableEntity } from "@azure/data-tables";
import { JobAction } from ".";

export class GmailJob implements TableEntity {
  partitionKey: string;
  @AutoMap()
  rowKey: string;
  @AutoMap()
  name: string;
  isActive: boolean;
  @AutoMap()
  action: JobAction;
  [x: string]: unknown;

  constructor(data: Partial<GmailJob>) {
    this.partitionKey = data?.partitionKey;
    this.rowKey = data?.rowKey;
    this.name = data?.name;
    this.isActive = data?.isActive;
    this.action = data?.action;
  }

  toEntity(): TableEntity {
    return {
      partitionKey: this.partitionKey,
      rowKey: this.rowKey,
      name: {
        type: "String",
        value: this.name,
      },
      isActive: {
        type: "Boolean",
        value: this.isActive,
      },
      action: {
        type: "String",
        value: this.action,
      },
    };
  }
}
