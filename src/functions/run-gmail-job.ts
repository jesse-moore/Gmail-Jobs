import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { GmailService } from '../services/gmail.service';
import { GmailJobService } from '../services/gmailJob.service';

export async function runGmailJobTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method !== 'POST') {
    return { status: 405, body: 'Method Not Allowed' };
  }
  const userId = request.params?.userId;
  if (!userId) {
    return { status: 400, body: 'userId is required' };
  }

  const userJobs = await GmailJobService.getJobsByUserId(userId);
  if (!userJobs.length) {
    return { status: 200, jsonBody: { jobResults: {} } };
  }

  for (const job of userJobs) {
    await GmailService.processJob(job, userId);
  }

  return { status: 200 };
}

app.http('runGmailJob', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'runGmailJob/{userId}',
  handler: runGmailJobTrigger,
});
