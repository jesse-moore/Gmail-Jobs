import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { GmailJobDTO } from '../dtos/GmailJobDTO';
import { HTTPProtectedTrigger } from '../services/auth.service';
import { JobFilterService } from '../services/jobFilter.service';

export async function manageUserJobsTrigger(request: HttpRequest, context: InvocationContext, userId: string): Promise<HttpResponseInit> {
  switch (request.method) {
    case 'GET':
      const jobDTOs = await JobFilterService.getJobsByUserId(userId);
      return { status: 200, jsonBody: { jobDTOs } };
    case 'POST':
      const postBody = (await request.json()) as GmailJobDTO;
      const postResult = await JobFilterService.createJob(userId, postBody);
      if (postResult.error) {
        return { status: 400, body: postResult.error };
      }

      return { status: 200, jsonBody: postResult.data };
    case 'PUT':
      const putBody = (await request.json()) as GmailJobDTO;
      const putResult = await JobFilterService.updateJob(userId, putBody);
      if (putResult.error) {
        return { status: 400, body: putResult.error };
      }

      return { status: 200, jsonBody: putResult.data };
    case 'DELETE':
      const jobId = request.params?.jobId;
      if (!jobId) {
        return { status: 400, body: 'JobId is required' };
      }

      const deleteResult = await JobFilterService.deleteJob(userId, jobId);
      if (deleteResult.error) {
        return { status: 400, body: deleteResult.error };
      }

      return { status: 200, jsonBody: deleteResult.data };
    default:
      return { status: 405, body: 'Method Not Allowed' };
  }
}

app.http('gmailJobs', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'function',
  route: 'gmailJobs/{jobId?}',
  handler: new HTTPProtectedTrigger(manageUserJobsTrigger).httpTrigger,
});
