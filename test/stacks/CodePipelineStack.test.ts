import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { CodePipelineStack } from '../../lib/stacks/CodePipelineStack';

describe('CodePipelineStack', () => {
  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const stack = new CodePipelineStack(app, 'CodePipelineStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  })
});
