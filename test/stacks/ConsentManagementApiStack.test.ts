import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { join } from 'path';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { CodePipelineStack } from '../../lib/stacks/CodePipelineStack';
import { ConsentDataStack } from '../../lib/stacks/ConsentDataStack';
import { ConsentManagementApiStack } from '../../lib/stacks/ConsentManagementApiStack';

describe('ConsentManagementApiStack', () => {
  // Normalize template IDs and attributes that change based on upstream package updates
  function cleanApiResources(templateJson: any) {
    const API_DEPLOYMENT_KEY_PREFIX = 'ConsentManagementApiDeployment';
    const API_LAMBDA_INVOKE_KEY_PREFIX = 'ConsentManagementApiLambdaInvoke';
    const API_GATEWAY_DEPLOYMENT_KEY_PREFIX = 'ConsentManagementAPIGatewayDeployment';
    const API_GATEWAY_DEPLOYMENT_STAGE_KEY_PREFIX = 'ConsentManagementAPIGatewayDeploymentStageprod';
    const OUTPUTS_KEY = 'Outputs';
    const PROPERTIES_KEY = 'Properties';
    const RESOURCES_KEY = 'Resources';

    // Remove API service code S3 path references which change on every API service package update
    delete templateJson[RESOURCES_KEY]['ConsentManagementApiLambda46174FE9'][PROPERTIES_KEY]['Code'];

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
      if (outputKey.startsWith('ConsentManagementAPIGatewayEndpoint')) {
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
    const dataStack = new ConsentDataStack(app, 'ConsentDataStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const apiStack = new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiCodePackageFilePath: join(__dirname, '../../../consent-management-api'),
      codeDeployRole: codePipelineStack.codeDeployRole,
      consentTable: dataStack.consentTable
    });

    const templateJson = Template.fromStack(apiStack).toJSON();
    cleanApiResources(templateJson);

    expect(templateJson).toMatchSnapshot();
  });
});
