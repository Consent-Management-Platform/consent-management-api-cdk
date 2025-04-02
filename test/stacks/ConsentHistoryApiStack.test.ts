import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { join } from 'path';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { CodePipelineStack } from '../../lib/stacks/CodePipelineStack';
import { ConsentHistoryDataStack } from '../../lib/stacks/ConsentHistoryDataStack';
import { ConsentHistoryApiStack } from '../../lib/stacks/ConsentHistoryApiStack';

describe('ConsentHistoryApiStack', () => {
  // Normalize template IDs and attributes that change based on upstream package updates
  function cleanApiResources(templateJson: any) {
    const API_DEPLOYMENT_KEY_PREFIX = 'ConsentHistoryApiDeployment';
    const API_LAMBDA_INVOKE_KEY_PREFIX = 'ConsentHistoryApiLambdaInvoke';
    const API_GATEWAY_DEPLOYMENT_KEY_PREFIX = 'ConsentHistoryAPIGatewayDeployment';
    const API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX = 'ConsentHistoryAPIGatewayDeploymentStageprod';
    const OUTPUTS_KEY = 'Outputs';
    const PROPERTIES_KEY = 'Properties';
    const RESOURCES_KEY = 'Resources';

    // Remove API service code S3 path references which change on every API service package update
    delete templateJson[RESOURCES_KEY]['ConsentHistoryApiLambda03FB76FC'][PROPERTIES_KEY]['Code'];

    // Normalize resource keys which change on upstream package updates
    for (const resourceKey in templateJson[RESOURCES_KEY]) {
      if (resourceKey.startsWith(API_LAMBDA_INVOKE_KEY_PREFIX)) {
        templateJson[RESOURCES_KEY][API_LAMBDA_INVOKE_KEY_PREFIX] = templateJson[RESOURCES_KEY][resourceKey];
        delete templateJson[RESOURCES_KEY][resourceKey];
      } else if (resourceKey.startsWith(API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX)) {
        templateJson[RESOURCES_KEY][API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX] = templateJson[RESOURCES_KEY][resourceKey];
        delete templateJson[RESOURCES_KEY][API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX][PROPERTIES_KEY]['DeploymentId'];
        delete templateJson[RESOURCES_KEY][resourceKey];
      } else if (resourceKey.startsWith(API_GATEWAY_DEPLOYMENT_KEY_PREFIX)) {
        templateJson[RESOURCES_KEY][API_GATEWAY_DEPLOYMENT_KEY_PREFIX] = templateJson[RESOURCES_KEY][resourceKey];
        delete templateJson[RESOURCES_KEY][resourceKey];
      } else if (resourceKey.startsWith(API_DEPLOYMENT_KEY_PREFIX)) {
        delete templateJson[RESOURCES_KEY][resourceKey];
      }
    }

    // Strip outputs that change dependent on upstream package updates
    for (const outputKey in templateJson[OUTPUTS_KEY]) {
      if (outputKey.startsWith('ConsentHistoryAPIGatewayEndpoint')) {
        delete templateJson[OUTPUTS_KEY][outputKey];
      }
    }
  }

  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();

    const codePipelineStack = new CodePipelineStack(app, 'CodePipelineStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const dataStack = new ConsentHistoryDataStack(app, 'ConsentHistoryDataStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const apiStack = new ConsentHistoryApiStack(app, 'ConsentHistoryApiStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiCodePackageFilePath: join(__dirname, '../../../consent-history-api'),
      codeDeployRole: codePipelineStack.codeDeployRole,
      consentHistoryTable: dataStack.consentHistoryTable
    });

    const templateJson = Template.fromStack(apiStack).toJSON();
    cleanApiResources(templateJson);

    expect(templateJson).toMatchSnapshot();
  });
});
