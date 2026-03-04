import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { CodePipelineStack } from '../../lib/stacks/CodePipelineStack';

describe('CodePipelineStack', () => {
  // Normalize template attributes that change based on upstream package updates
  function cleanDynamicResources(templateJson: any) {
    const PROPERTIES_KEY = 'Properties';
    const RESOURCES_KEY = 'Resources';

    // Remove code path/hash references which change with upstream updates
    delete templateJson[RESOURCES_KEY]['CustomAWSCDKOpenIdConnectProviderCustomResourceProviderHandlerF2C543E0'][PROPERTIES_KEY]['Code'];
    delete templateJson[RESOURCES_KEY]['GitHubOIDCProvider4F328116'][PROPERTIES_KEY]['CodeHash'];
  }

  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const codePipelineStack = new CodePipelineStack(app, 'CodePipelineStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const templateJson = Template.fromStack(codePipelineStack).toJSON();
    cleanDynamicResources(templateJson);

    expect(templateJson).toMatchSnapshot();
  })
});
