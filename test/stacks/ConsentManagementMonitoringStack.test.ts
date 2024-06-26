import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { join } from 'path';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { ConsentDataStack } from '../../lib/stacks/ConsentDataStack';
import { ConsentManagementApiStack } from '../../lib/stacks/ConsentManagementApiStack';
import { ConsentManagementMonitoringStack } from '../../lib/stacks/ConsentManagementMonitoringStack';

describe('ConsentManagementMonitoringStack', () => {
  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const dataStack = new ConsentDataStack(app, 'ConsentDataStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const apiStack = new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiCodePackageFilePath: join(__dirname, '../../../consent-management-api'),
      consentTable: dataStack.consentTable
    });
    const monitoringStack = new ConsentManagementMonitoringStack(app, 'ConsentManagementMonitoringStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiLambda: apiStack.apiLambda,
      consentTable: dataStack.consentTable,
      restApi: apiStack.restApi
    });

    const templateJson = Template.fromStack(monitoringStack).toJSON();
    expect(templateJson).toMatchSnapshot();
  });
});
