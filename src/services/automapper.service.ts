import { classes } from '@automapper/classes';
// prettier-ignore
import { createMap, createMapper, extend, forMember, mapFrom } from '@automapper/core';
import { GmailJobDTO } from '../dtos/GmailJobDTO';
import { GmailJobRuleBaseDTO, GmailJobRuleDTO, GmailJobRuleGroupDTO } from '../dtos/GmailJobFilterDTO';
import { GmailJobRule, GmailJobRuleBase, GmailJobRuleGroup } from '../models';
import { GmailJob } from '../models/GmailJob';

const mapper = createMapper({
  strategyInitializer: classes(),
});

createMap(
  mapper,
  GmailJob,
  GmailJobDTO,
  // prettier-ignore
  forMember((d) => d.id, mapFrom((s) => s.rowKey))
);

createMap(
  mapper,
  GmailJobDTO,
  GmailJob,
  // prettier-ignore
  forMember((d) => d.rowKey, mapFrom((s) => s.id))
);

createMap(
  mapper,
  GmailJobRuleBase,
  GmailJobRuleBaseDTO,
  // prettier-ignore
  forMember(d => d.id, mapFrom(s => s.rowKey)),
  // prettier-ignore
  forMember(d => d.jobId, mapFrom(s => s.jobId?.value)),
  // prettier-ignore
  forMember(d => d.groupId, mapFrom(s => s.groupId?.value)),
  // prettier-ignore
  forMember(d => d.order, mapFrom(s => s.order)),
  // prettier-ignore
  forMember(d => d.type, mapFrom(s => s.type))
);

createMap(
  mapper,
  GmailJobRuleGroup,
  GmailJobRuleGroupDTO,
  extend(GmailJobRuleBase, GmailJobRuleBaseDTO),
  // prettier-ignore
  forMember(d => d.operator, mapFrom(s => s.operator))
);

createMap(
  mapper,
  GmailJobRule,
  GmailJobRuleDTO,
  extend(GmailJobRuleBase, GmailJobRuleBaseDTO),
  // prettier-ignore
  forMember(d => d.operator, mapFrom(s => s.operator)),
  // prettier-ignore
  forMember(d => d.value, mapFrom(s => s.value))
);

createMap(
  mapper,
  GmailJobRuleBaseDTO,
  GmailJobRuleBase,
  // prettier-ignore
  forMember(e => e.rowKey, mapFrom(d => d.id)),
  // prettier-ignore
  forMember(e => e.jobId, mapFrom(d => ({ type: 'Guid', value: d.jobId  }))),
  // prettier-ignore
  forMember(e => e.groupId, mapFrom(d => (d.groupId ? { type: 'Guid', value: d.groupId } : undefined))),
  // prettier-ignore
  forMember(e => e.order, mapFrom(d => d.order)),
  // prettier-ignore
  forMember(e => e.type, mapFrom(d => d.type))
);

createMap(
  mapper,
  GmailJobRuleGroupDTO,
  GmailJobRuleGroup,
  extend(GmailJobRuleBaseDTO, GmailJobRuleBase),
  // prettier-ignore
  forMember(e => e.operator, mapFrom(d => d.operator))
);

createMap(
  mapper,
  GmailJobRuleDTO,
  GmailJobRule,
  extend(GmailJobRuleBaseDTO, GmailJobRuleBase),
  // prettier-ignore
  forMember(e => e.operator, mapFrom(d => d.operator)),
  // prettier-ignore
  forMember(e => e.value, mapFrom(d => d.value))
);

export { mapper };
