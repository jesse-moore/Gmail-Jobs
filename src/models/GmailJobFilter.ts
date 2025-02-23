import { TableEntity } from '@azure/data-tables';
import { GroupOperator, Period, PeriodRuleOperator, RuleOperator, RuleType, TableEntityProperty } from '.';

export class GmailJobRuleBase implements TableEntity {
  partitionKey: string;
  rowKey: string;
  jobId: TableEntityProperty<string>;
  groupId: TableEntityProperty<string | null>;
  type: string;
  order: number;
  isActive: boolean;
  [x: string]: unknown;

  constructor(data: Partial<GmailJobRuleBase>) {
    this.partitionKey = data?.partitionKey;
    this.rowKey = data?.rowKey;
    this.jobId = data?.jobId
      ? {
          type: 'Guid',
          value: data.jobId.value,
        }
      : null;
    this.groupId = data?.groupId
      ? {
          type: 'Guid',
          value: data.groupId.value,
        }
      : null;
    this.order = data?.order;
    this.isActive = data?.isActive;
  }

  toEntity(): TableEntity {
    const entity: TableEntity = {
      partitionKey: this.partitionKey,
      rowKey: this.rowKey,
      isActive: {
        type: 'Boolean',
        value: this.isActive,
      },
      type: {
        type: 'String',
        value: this.type,
      },
      order: {
        type: 'Int32',
        value: this.order,
      },
      jobId: {
        type: 'Guid',
        value: this.jobId.value,
      },
    };
    if (this.groupId) {
      entity.groupId = {
        type: 'Guid',
        value: this.groupId.value,
      };
    }
    return entity;
  }
}

export class GmailJobRule<TOperator extends RuleOperator> extends GmailJobRuleBase {
  operator: string;
  value: TOperator extends PeriodRuleOperator ? Period : string | string;
  type: RuleType.Rule;

  constructor(data: Partial<GmailJobRule<TOperator>>) {
    super(data);
    this.value = data?.value;
    this.operator = data?.operator;
    this.type = RuleType.Rule;
  }

  toEntity(): TableEntity {
    return {
      ...super.toEntity(),
      operator: {
        type: 'String',
        value: this.operator,
      },
      value: {
        type: 'String',
        value: this.value,
      },
      type: {
        type: 'String',
        value: this.type,
      },
    };
  }
}

export class GmailJobRuleGroup extends GmailJobRuleBase {
  operator: GroupOperator;
  type: RuleType.Group;

  constructor(data: Partial<GmailJobRuleGroup>) {
    super(data);
    this.operator = data?.operator;
    this.type = RuleType.Group;
  }

  toEntity(): TableEntity {
    return {
      ...super.toEntity(),
      operator: {
        type: 'String',
        value: this.operator,
      },
      type: {
        type: 'String',
        value: this.type,
      },
    };
  }
}
