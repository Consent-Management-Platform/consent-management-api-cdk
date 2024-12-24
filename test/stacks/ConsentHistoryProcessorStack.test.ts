import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { join } from 'path';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { ConsentDataStack } from '../../lib/stacks/ConsentDataStack';
import { ConsentHistoryProcessorStack } from '../../lib/stacks/ConsentHistoryProcessorStack';

describe('ConsentHistoryProcessorStack', () => {
  // Normalize template IDs and attributes that change based on upstream package updates
  function cleanLambdaResources(templateJson: any) {
    const API_LAMBDA_INVOKE_KEY_PREFIX = 'ConsentHistoryProcessorLambdaInvoke';
    const PROPERTIES_KEY = 'Properties';
    const RESOURCES_KEY = 'Resources';

    // Remove Lambda service code S3 path references which change on every service package update
    delete templateJson[RESOURCES_KEY]['ConsentHistoryProcessorLambdaB5C5B4EA'][PROPERTIES_KEY]['Code'];

    // Normalize resource keys which change on upstream package updates
    for (const resourceKey in templateJson[RESOURCES_KEY]) {
      if (resourceKey.startsWith(API_LAMBDA_INVOKE_KEY_PREFIX)) {
        templateJson[RESOURCES_KEY][API_LAMBDA_INVOKE_KEY_PREFIX] = templateJson[RESOURCES_KEY][resourceKey];
        delete templateJson[RESOURCES_KEY][resourceKey];
      }
    }
  }

  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const dataStack = new ConsentDataStack(app, 'ConsentDataStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG
    });
    const consentHistoryProcessorStack = new ConsentHistoryProcessorStack(app, 'ConsentHistoryProcessorStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      codePackageFilePath: join(__dirname, '../../../consent-history-ingestor'),
      consentTable: dataStack.consentTable
    });

    const templateJson = Template.fromStack(consentHistoryProcessorStack).toJSON();
    cleanLambdaResources(templateJson);

    expect(templateJson).toMatchSnapshot();
  });
});
