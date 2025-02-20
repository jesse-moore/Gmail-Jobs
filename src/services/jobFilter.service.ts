import { TableClient, TableEntityResult } from '@azure/data-tables';
import { randomUUID } from 'crypto';
import { GmailJobDTO } from '../dtos/GmailJobDTO';
import { GmailJobRuleBaseDTO, GmailJobRuleDTO, GmailJobRuleGroupDTO } from '../dtos/GmailJobFilterDTO';
import { GmailJob, GmailJobRule, GmailJobRuleBase, GmailJobRuleGroup, RuleOperator, RuleType } from '../models';
import { mapper } from './automapper.service';

export class JobFilterService {
  constructor() {}

  static getJobsByUserId = async (userId: string): Promise<GmailJobDTO[]> => {
    const jobs = (await this.getJobEntities(userId)).filter(x => x.isActive);
    const jobIds = jobs.map(x => x.rowKey);
    const filters = (await this.getFilterEntities(jobIds)).filter(x => x.isActive);

    const filtersByJob: Record<string, GmailJobRuleBaseDTO[]> = {};
    for await (const filter of filters) {
      filtersByJob[filter.partitionKey] = filtersByJob[filter.partitionKey] || [];
      let filterDTO: GmailJobRuleBaseDTO;
      if (filter.type === RuleType.Group) {
        filterDTO = mapper.map(filter as TableEntityResult<GmailJobRuleGroup>, GmailJobRuleGroup, GmailJobRuleGroupDTO);
      } else {
        filterDTO = mapper.map(filter as TableEntityResult<GmailJobRule<RuleOperator>>, GmailJobRule, GmailJobRuleDTO);
      }
      filtersByJob[filter.partitionKey].push(filterDTO);
    }

    const jobDtos: GmailJobDTO[] = mapper.mapArray(jobs, GmailJob, GmailJobDTO);
    jobDtos.forEach(job => {
      const jobFilters = (filtersByJob[job.id] ?? []).sort((a, b) => {
        if (a.type === RuleType.Group && b.type === RuleType.Rule) return -1;
        if (a.type === RuleType.Rule && b.type === RuleType.Group) return 1;
        return a.order - b.order;
      });

      job.rules = this.nestRules(jobFilters);
    });

    return jobDtos;
  };

  static getJobById = async (userId: string, jobId: string): Promise<GmailJobDTO> => {
    const job = await this.getJobEntity(userId, jobId);
    if (!job || !job.isActive) return null;
    const filters = await this.getFilterEntities([job.rowKey]);

    const jobRules: GmailJobRuleBaseDTO[] = [];
    for await (const filter of filters) {
      if (!filter.isActive) continue;
      let filterDTO: GmailJobRuleBaseDTO;
      if (filter.type === RuleType.Group) {
        filterDTO = mapper.map(filter as TableEntityResult<GmailJobRuleGroup>, GmailJobRuleGroup, GmailJobRuleGroupDTO);
      } else {
        filterDTO = mapper.map(filter as TableEntityResult<GmailJobRule<RuleOperator>>, GmailJobRule, GmailJobRuleDTO);
      }
      jobRules.push(filterDTO);
    }

    const jobDto: GmailJobDTO = mapper.map(job, GmailJob, GmailJobDTO);
    const jobFilters = jobRules.sort((a, b) => {
      if (a.type === RuleType.Group && b.type === RuleType.Rule) return -1;
      if (a.type === RuleType.Rule && b.type === RuleType.Group) return 1;
      return a.order - b.order;
    });
    jobDto.rules = this.nestRules(jobFilters);

    return jobDto;
  };

  static createJob = async (userId: string, job: GmailJobDTO): Promise<{ error: string; data: GmailJobDTO }> => {
    const result = { error: null, data: null };
    const validation = GmailJobDTO.validate(job);
    if (!validation.success) {
      result.error = 'Invalid job data';
      return result;
    }

    const jobExists = await this.checkJobExists(userId, job.name);
    if (jobExists) {
      result.error = 'Job already exists';
      return result;
    }

    for (let rule of job.rules) {
      const validateRule = GmailJobRuleBaseDTO.validate(rule);
      if (!validateRule.success) {
        result.error = 'Invalid rule data';
        return result;
      }
    }

    const createJobEntity = mapper.map(job, GmailJobDTO, GmailJob);
    createJobEntity.partitionKey = userId;
    createJobEntity.rowKey = randomUUID();
    createJobEntity.isActive = true;

    const flattenedJobRules = JobFilterService.flattenRules(job.rules);
    const createRuleEntities: GmailJobRuleBase[] = [];
    for (let rule of flattenedJobRules) {
      let ruleEntity: GmailJobRuleBase;
      if (rule.type === RuleType.Group) {
        ruleEntity = mapper.map(rule, GmailJobRuleGroupDTO, GmailJobRuleGroup);
      } else {
        ruleEntity = mapper.map(rule, GmailJobRuleDTO, GmailJobRule);
      }
      ruleEntity.partitionKey = createJobEntity.rowKey;
      ruleEntity.isActive = true;
      createRuleEntities.push(ruleEntity);
    }

    const gmailJobsClient = await this.getJobsTableClient();
    const gmailFiltersClient = await this.getFiltersTableClient();

    await gmailJobsClient.createEntity(createJobEntity.toEntity());
    for (let rule of createRuleEntities) {
      await gmailFiltersClient.createEntity(rule.toEntity());
    }

    result.data = await this.getJobById(userId, createJobEntity.rowKey);
    return result;
  };

  static updateJob = async (userId: string, job: GmailJobDTO): Promise<{ error: string; data: GmailJobDTO }> => {
    const result = { error: null, data: null };
    const validation = GmailJobDTO.validate(job);
    if (!validation.success) {
      result.error = 'Invalid job data';
      return result;
    }

    const existingJob = await this.getJobEntity(userId, job.id);
    if (!existingJob || !existingJob.isActive) {
      result.error = 'Job not found';
      return result;
    }

    for (let rule of job.rules) {
      const validateRule = GmailJobRuleBaseDTO.validate(rule);
      if (!validateRule.success) {
        result.error = 'Invalid rule data';
        return result;
      }
    }

    const updateJobEntity = mapper.map(job, GmailJobDTO, GmailJob);
    updateJobEntity.isActive = true;

    const flattenedJobRules = JobFilterService.flattenRules(job.rules);
    const updateRuleEntities: GmailJobRuleBase[] = [];
    for (let rule of flattenedJobRules) {
      let ruleEntity: GmailJobRuleBase;
      if (rule.type === RuleType.Group) {
        ruleEntity = mapper.map(rule, GmailJobRuleGroupDTO, GmailJobRuleGroup);
      } else {
        ruleEntity = mapper.map(rule, GmailJobRuleDTO, GmailJobRule);
      }
      ruleEntity.isActive = true;
      updateRuleEntities.push(ruleEntity);
    }

    var existingJobRules = await this.getFilterEntities([updateJobEntity.rowKey]);
    const existingRuleIds = existingJobRules.map(x => x.rowKey);
    const createRules = updateRuleEntities.filter(x => !existingRuleIds.includes(x.rowKey));
    const updateRules = updateRuleEntities.filter(x => existingRuleIds.includes(x.rowKey));
    const deleteRules = existingJobRules.filter(x => !updateRuleEntities.find(y => y.rowKey === x.rowKey));

    const gmailJobsClient = await this.getJobsTableClient();
    const gmailFiltersClient = await this.getFiltersTableClient();

    await gmailJobsClient.updateEntity({ ...updateJobEntity.toEntity(), partitionKey: userId }, "Replace");
    for (let rule of createRules) {
      await gmailFiltersClient.createEntity({...rule.toEntity(), partitionKey: updateJobEntity.rowKey});
    }
    
    for (let rule of updateRules) {
      await gmailFiltersClient.updateEntity({...rule.toEntity(), partitionKey: updateJobEntity.rowKey}, "Replace");
    }
    
    for (let rule of deleteRules) {
      rule.isActive = false;
      await gmailFiltersClient.updateEntity({ ...rule.toEntity(), partitionKey: updateJobEntity.rowKey }, "Replace");
    }

    result.data = await this.getJobById(userId, updateJobEntity.rowKey);
    return result;
  };

  static deleteJob = async (userId: string, jobId: string): Promise<{ error: string; data: GmailJobDTO }> => {
    const result = { error: null, data: null };

    const gmailJobsClient = await this.getJobsTableClient();
    const gmailFiltersClient = await this.getFiltersTableClient();

    const jobEntity = await this.getJobEntity(userId, jobId);
    if (!jobEntity || !jobEntity.isActive) {
      result.error = 'Job not found';
      return result;
    }

    var jobRuleEntities = await this.getFilterEntities([jobEntity.rowKey]);

    await gmailJobsClient.updateEntity({ ...jobEntity, isActive: false }, "Replace");
    for (let rule of jobRuleEntities) {
      await gmailFiltersClient.updateEntity({ ...rule, isActive: false }, "Replace");
    }

    result.data = await this.getJobById(userId, jobEntity.rowKey);
    return result;
  };

  private static getJobsTableClient = async () => {
    const connectionString = 'UseDevelopmentStorage=true';
    const gmailJobsClient = TableClient.fromConnectionString(connectionString, 'gmailJobs');
    await gmailJobsClient.createTable();
    return gmailJobsClient;
  };

  private static getFiltersTableClient = async () => {
    const connectionString = 'UseDevelopmentStorage=true';
    const gmailFiltersClient = TableClient.fromConnectionString(connectionString, 'gmailFilters');
    await gmailFiltersClient.createTable();
    return gmailFiltersClient;
  };

  private static getJobEntities = async (userId: string): Promise<GmailJob[]> => {
    const gmailJobsClient = await this.getJobsTableClient();
    const jobsRequest = gmailJobsClient.listEntities<GmailJob>({
      queryOptions: { filter: `PartitionKey eq '${userId}'` },
    });

    const jobs: GmailJob[] = [];
    for await (const job of jobsRequest) {
      jobs.push(job);
    }

    return jobs;
  };

  private static getJobEntity = async (userId: string, jobId: string): Promise<GmailJob> => {
    const gmailJobsClient = await this.getJobsTableClient();
    const jobRequest = await gmailJobsClient.getEntity<GmailJob>(userId, jobId);
    return new GmailJob(jobRequest);
  };

  private static getFilterEntities = async (jobIds: string[]): Promise<GmailJobRuleBase[]> => {
    const gmailFiltersClient = await this.getFiltersTableClient();
    const filtersRequest = gmailFiltersClient.listEntities<GmailJobRuleBase>({
      queryOptions: { filter: `${jobIds.map(x => `PartitionKey eq '${x}'`).join(' or ')}` },
    });

    const filters: GmailJobRuleBase[] = [];
    for await (const filter of filtersRequest) {
      if (filter.type === RuleType.Group) {
        filters.push(new GmailJobRuleGroup(filter as TableEntityResult<GmailJobRuleGroup>));
      } else {
        filters.push(new GmailJobRule(filter as TableEntityResult<GmailJobRule<RuleOperator>>));
      }
    }

    return filters;
  };

  private static nestRules = (jobRules: GmailJobRuleBaseDTO[]): GmailJobRuleBaseDTO[] => {
    if (!jobRules.find(x => x.type === RuleType.Group)) return jobRules;

    const rootGroup = jobRules.find(x => x.type === RuleType.Group && !x.groupId) as GmailJobRuleGroupDTO;
    const groupRules = getGroupRules(rootGroup, jobRules);
    rootGroup.rules = groupRules;

    function getGroupRules(group: GmailJobRuleGroupDTO, rules: GmailJobRuleBaseDTO[]): GmailJobRuleBaseDTO[] {
      const groupRules = rules.filter(x => x.groupId === group.id);
      groupRules.forEach(rule => {
        if (rule.type === RuleType.Group) {
          (rule as GmailJobRuleGroupDTO).rules = getGroupRules(rule as GmailJobRuleGroupDTO, rules);
        }
      });
      return groupRules.sort((a, b) => a.order - b.order);
    }

    return [rootGroup];
  };

  private static checkJobExists = async (userId: string, jobName: string): Promise<boolean> => {
    const gmailJobsClient = await this.getJobsTableClient();
    try {
      const existingJobs = gmailJobsClient.listEntities<GmailJob>({
        queryOptions: { filter: `PartitionKey eq '${userId}' and name eq '${jobName}' and isActive eq true` },
      });

      for await (const _ of existingJobs) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  private static flattenRules = (rules: GmailJobRuleBaseDTO[], depth: number = -1, groupId: string = null): GmailJobRuleBaseDTO[] => {
    depth++;
    const result = rules.flatMap(x => {
      x.id = x.id ?? randomUUID();
      if (x.type === RuleType.Group) {
        x.groupId = depth === 0 ? null : groupId;
        return [x, ...JobFilterService.flattenRules((x as GmailJobRuleGroupDTO).rules, depth, x.id)];
      }
      x.groupId = groupId;
      return x;
    });
    return result;
  };
}
