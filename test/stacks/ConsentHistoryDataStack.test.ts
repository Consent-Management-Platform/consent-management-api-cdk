import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { ConsentHistoryDataStack } from '../../lib/stacks/ConsentHistoryDataStack';

describe('ConsentHistoryDataStack', () => {
  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const consentHistoryDataStack = new ConsentHistoryDataStack(app, 'ConsentHistoryDataStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const template = Template.fromStack(consentHistoryDataStack);
    expect(template.toJSON()).toMatchSnapshot();
  })
});
