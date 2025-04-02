import { Environment } from 'aws-cdk-lib';
import { readFileSync } from 'fs';

export function constructApiDefinition(stackEnvironment: Environment, apiLambdaArn: string, openApiSpecFilePath: string) {
  const apiDefinition = JSON.parse(readFileSync(openApiSpecFilePath, 'utf8'));

  // Replace placeholders in API Gateway integration settings
  for (const path in apiDefinition.paths) {
    for (const operation in apiDefinition.paths[path]) {
      const integration = apiDefinition.paths[path][operation]['x-amazon-apigateway-integration'];
      if(!integration) {
        throw new Error(`Smithy models missing API Gateway integration config for path: '${path}', operation: '${operation}'`);
      }

      integration.uri = `arn:aws:apigateway:${stackEnvironment.region}:lambda:path/2015-03-31/functions/${apiLambdaArn}/invocations`;
    }
  }

  return apiDefinition;
}
