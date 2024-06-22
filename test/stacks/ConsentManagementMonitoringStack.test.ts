import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { join } from 'path';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { ConsentManagementApiStack } from '../../lib/stacks/ConsentManagementApiStack';
import { ConsentManagementMonitoringStack } from '../../lib/stacks/ConsentManagementMonitoringStack';

describe('ConsentManagementMonitoringStack', () => {
  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const apiStack = new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiCodePackageFilePath: join(__dirname, '../../../consent-management-api')
    });
    const monitoringStack = new ConsentManagementMonitoringStack(app, 'ConsentManagementMonitoringStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiLambda: apiStack.apiLambda,
      restApi: apiStack.restApi
    });

    const templateJson = Template.fromStack(monitoringStack).toJSON();
    expect(templateJson).toMatchSnapshot();
  });
});
