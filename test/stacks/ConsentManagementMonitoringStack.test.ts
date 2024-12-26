import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { join } from 'path';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { ConsentDataStack } from '../../lib/stacks/ConsentDataStack';
import { ConsentHistoryDataStack } from '../../lib/stacks/ConsentHistoryDataStack';
import { ConsentHistoryProcessorStack } from '../../lib/stacks/ConsentHistoryProcessorStack';
import { ConsentManagementApiStack } from '../../lib/stacks/ConsentManagementApiStack';
import { ConsentManagementMonitoringStack } from '../../lib/stacks/ConsentManagementMonitoringStack';

describe('ConsentManagementMonitoringStack', () => {
  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const consentDataStack = new ConsentDataStack(app, 'ConsentDataStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const consentHistoryDataStack = new ConsentHistoryDataStack(app, 'ConsentHistoryDataStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const apiStack = new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiCodePackageFilePath: join(__dirname, '../../../consent-management-api'),
      consentTable: consentDataStack.consentTable
    });
    const consentHistoryProcessorStack: ConsentHistoryProcessorStack = new ConsentHistoryProcessorStack(app, 'ConsentHistoryProcessorStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      codePackageFilePath: join(__dirname, '../../../consent-history-ingestor'),
      consentTable: consentDataStack.consentTable,
      consentHistoryTable: consentHistoryDataStack.consentHistoryTable
    });
    const monitoringStack = new ConsentManagementMonitoringStack(app, 'ConsentManagementMonitoringStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      consentManagementApiLambda: apiStack.apiLambda,
      consentHistoryProcessorLambda: consentHistoryProcessorStack.consentHistoryProcessorLambda,
      consentTable: consentDataStack.consentTable,
      consentHistoryTable: consentHistoryDataStack.consentHistoryTable,
      restApi: apiStack.restApi
    });

    const templateJson = Template.fromStack(monitoringStack).toJSON();
    expect(templateJson).toMatchSnapshot();
  });
});
