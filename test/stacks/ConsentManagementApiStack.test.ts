import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { join } from 'path';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { ConsentManagementApiStack } from '../../lib/stacks/ConsentManagementApiStack';

describe('ConsentManagementApiStack', () => {
  // Normalize template IDs and attributes that change based on upstream package updates
  function cleanApiResources(templateJson: any) {
    const RESOURCES_KEY = 'Resources';
    const API_LAMBDA_INVOKE_KEY_PREFIX = 'ConsentManagementAPILambdaInvoke';
    const API_GATEWAY_DEPLOYMENT_KEY_PREFIX = 'ConsentManagementAPIGatewayDeployment';
    const API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX = 'ConsentManagementAPIGatewayDeploymentStagedev';

    // Remove API service code S3 path references which change on every API service package update
    delete templateJson[RESOURCES_KEY]['ConsentManagementAPILambda33B42EFA']['Properties']['Code'];

    // Normalize resource keys which change on upstream package updates
    for (const resourceKey in templateJson[RESOURCES_KEY]) {
      if (resourceKey.startsWith(API_LAMBDA_INVOKE_KEY_PREFIX)) {
        templateJson[RESOURCES_KEY][API_LAMBDA_INVOKE_KEY_PREFIX] = templateJson[RESOURCES_KEY][resourceKey];
        delete templateJson[RESOURCES_KEY][resourceKey];
      } else if (resourceKey.startsWith(API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX)) {
        templateJson[RESOURCES_KEY][API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX] = templateJson[RESOURCES_KEY][resourceKey];
        delete templateJson[RESOURCES_KEY][API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX]['Properties']['DeploymentId'];
        delete templateJson[RESOURCES_KEY][resourceKey];
      } else if (resourceKey.startsWith(API_GATEWAY_DEPLOYMENT_KEY_PREFIX)) {
        templateJson[RESOURCES_KEY][API_GATEWAY_DEPLOYMENT_KEY_PREFIX] = templateJson[RESOURCES_KEY][resourceKey];
        delete templateJson[RESOURCES_KEY][resourceKey];
      }
    }
  }

  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const apiStack = new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiCodePackageFilePath: join(__dirname, '../../../consent-management-api')
    });

    const templateJson = Template.fromStack(apiStack).toJSON();
    cleanApiResources(templateJson);

    expect(templateJson).toMatchSnapshot();
  });
});
