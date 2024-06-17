import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { ConsentDataStack } from '../../lib/stacks/ConsentDataStack';

describe('ConsentDataStack', () => {
  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const consentDataStack = new ConsentDataStack(app, 'ConsentDataStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const template = Template.fromStack(consentDataStack);
    expect(template.toJSON()).toMatchSnapshot();
  })
});
