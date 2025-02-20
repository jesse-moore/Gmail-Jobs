export * from "./GmailJob";
export * from "./GmailJobFilter";

export type Period = `${number}${"D" | "M" | "Y"}`;

export enum PeriodRuleOperator {
  OlderThan = "older_than",
  NewerThan = "newer_than",
}

export enum FromRuleOperator {
  From = "from",
}

export enum LabelRuleOperator {
  Label = "label",
}

export type RuleOperator = PeriodRuleOperator | FromRuleOperator | LabelRuleOperator;

export enum JobAction {
  Archive = "archive",
  Delete = "delete",
}

export enum GroupOperator {
  And = "AND",
  Or = "OR",
}

export enum RuleType {
  Group = "group",
  Rule = "rule",
}

export interface GoogleClientSecret {
  installed: {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

export class TableEntityProperty<T> {
  type: "String" | "Guid" | "Int32";
  value: T;
}