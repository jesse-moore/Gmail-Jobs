import { AutoMap } from '@automapper/classes';
import { GmailJobRuleBaseDTO, GmailJobRuleDTO, GmailJobRuleGroupDTO } from './GmailJobFilterDTO';
import { SafeParseReturnType, z } from 'zod';
import { RuleType } from '../models';

export enum GmailJobAction {
  Archive = 'archive',
  // Delete = 'delete',
  // MarkRead = 'markRead',
  // MarkUnread = 'markUnread',
  // MoveTo = 'moveTo',
  // Star = 'star',
  // Unstar = 'unstar',
}

export class GmailJobDTO {
  @AutoMap()
  id: string;
  @AutoMap()
  name: string;
  @AutoMap()
  action: GmailJobAction;
  rules: GmailJobRuleBaseDTO[] = [];

  constructor(data: z.infer<typeof GmailJobDTO.schema>) {
    if (!data) return;
    this.id = data.id;
    this.name = data.name;
    this.action = data.action;
    this.rules = data.rules.map(rule => {
      if (rule.type === RuleType.Group) {        
        return new GmailJobRuleGroupDTO(rule as z.infer<typeof GmailJobRuleGroupDTO.schema>);
      }
      return new GmailJobRuleDTO(rule as z.infer<typeof GmailJobRuleDTO.schema>);
    });
  }

  static validate(data: unknown): SafeParseReturnType<unknown, z.infer<typeof GmailJobDTO.schema>> {
    return GmailJobDTO.schema.safeParse(data);
  }

  static schema = z.object({
    id: z.string().uuid('Invalid GUID format').nullable(),
    name: z.string().min(1, 'Name is required'),
    action: z.nativeEnum(GmailJobAction),
    rules: z
      .array(GmailJobRuleBaseDTO.baseSchema)
      .min(1)
      .max(1)
      .refine(rules => checkDepth(rules, 3), {
        message: 'Rules exceed maximum depth of 3',
      }),
  });
}

const checkDepth = (rules: any[], maxDepth: number, currentDepth = 1): boolean => {
  if (currentDepth > maxDepth) {
    return false;
  }
  return rules.every(rule => {
    if (rule.rules && Array.isArray(rule.rules)) {
      return checkDepth(rule.rules, maxDepth, currentDepth + 1);
    }
    return true;
  });
};
