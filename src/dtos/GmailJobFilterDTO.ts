import { RuleType, GroupOperator, Period, RuleOperator, PeriodRuleOperator, FromRuleOperator, LabelRuleOperator } from '../models';
import { SafeParseReturnType, z } from 'zod';

export class GmailJobRuleBaseDTO {
  id: string;
  jobId: string;
  type: RuleType;
  groupId: string;
  order: number;

  constructor(data: z.infer<typeof GmailJobRuleBaseDTO.baseSchema>) {
    if (!data) return;
    this.id = data.id;
    this.jobId = data.jobId;
    this.type = data.type;
    this.groupId = data.groupId;
    this.order = data.order;
  }

  static validate(data: unknown): SafeParseReturnType<unknown, z.infer<typeof GmailJobRuleGroupDTO.schema | typeof GmailJobRuleDTO.schema>> {
    const baseValidation = GmailJobRuleBaseDTO.baseSchema.safeParse(data);
    if (!baseValidation.success) return baseValidation;
    if (baseValidation.data.type === RuleType.Group) {
      return GmailJobRuleGroupDTO.schema.safeParse(data);
    } else {
      return GmailJobRuleDTO.schema.safeParse(data);
    }
  }

  static baseSchema = z.object({
    id: z.string().uuid('Invalid GUID format').nullable(),
    jobId: z.string().uuid('Invalid GUID format').nullable(),
    type: z.nativeEnum(RuleType),
    groupId: z.string().uuid('Invalid GUID format').nullable().optional(),
    order: z.number(),
  });
}

export class GmailJobRuleGroupDTO extends GmailJobRuleBaseDTO {
  operator: GroupOperator;
  type: RuleType.Group;
  rules: GmailJobRuleBaseDTO[] = [];

  constructor(data: z.infer<typeof GmailJobRuleGroupDTO.schema>) {
    super(data);
    if (!data) return;
    this.operator = data.operator;
    this.rules = data.rules.map(rule => {
      if (rule.type === RuleType.Group) {        
        return new GmailJobRuleGroupDTO(rule as z.infer<typeof GmailJobRuleGroupDTO.schema>);
      }
      return new GmailJobRuleDTO(rule as z.infer<typeof GmailJobRuleDTO.schema>);
    });
  }

  static schema = GmailJobRuleBaseDTO.baseSchema.extend({
    operator: z.nativeEnum(GroupOperator),
    type: z.literal(RuleType.Group),
    rules: z.array(GmailJobRuleBaseDTO.baseSchema).min(2, 'A Least two rules are required'),
  });
}

export class GmailJobRuleDTO extends GmailJobRuleBaseDTO {
  operator: FromRuleOperator | PeriodRuleOperator | LabelRuleOperator;
  value: string;
  type: RuleType.Rule;

  constructor(data: z.infer<typeof GmailJobRuleDTO.schema>) {
    super(data);
    if (!data) return;
    this.operator = data.operator;
    this.value = data.value;
  }

  static schema = GmailJobRuleBaseDTO.baseSchema
    .extend({
      operator: z.nativeEnum(FromRuleOperator).or(z.nativeEnum(PeriodRuleOperator)).or(z.nativeEnum(LabelRuleOperator)),
      value: z.string().min(1),
      type: z.literal(RuleType.Rule),
    })
    .superRefine((data, ctx) => {
      if (Object.values(PeriodRuleOperator).includes(data.operator as PeriodRuleOperator)) {
        if (!/^\d+(D|M|Y)$/.test(data.value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid period format',
          });
        }
      }
    });
}
