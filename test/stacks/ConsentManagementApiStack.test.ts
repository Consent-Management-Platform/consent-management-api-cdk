import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { join } from 'path';

import { MOCK_ENV } from '../../fixtures/mock-env';
import { MOCK_STAGE_CONFIG } from '../../fixtures/mock-stage-config';
import { ConsentManagementApiStack } from '../../lib/stacks/ConsentManagementApiStack';

describe('ConsentManagementApiStack', () => {
  // Strip or replace template sections that change on every upstream API service code update
  function cleanApiResources(templateJson: any) {
    // Clear API service code S3 references which change every time there are upstream code updates
    delete templateJson['Resources']['ConsentManagementAPILambda33B42EFA']['Properties']['Code'];

    // Replace resource keys which change every time there are upstream service code updates
    for (const resourceKey in templateJson['Resources']) {
      if (resourceKey.startsWith('ConsentManagementAPILambdaInvoke')) {
        templateJson['Resources']['ConsentManagementAPILambdaInvoke'] = templateJson['Resources'][resourceKey];
        delete templateJson['Resources'][resourceKey];
      }
    }
  }

  it('creates the expected CloudFormation template from CDK', () => {
    const app = new App();
    const consentDataStack = new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
      env: MOCK_ENV,
      stageConfig: MOCK_STAGE_CONFIG,
      apiCodePackageFilePath: join(__dirname, '../../../consent-management-api')
    });

    const templateJson = Template.fromStack(consentDataStack).toJSON();
    cleanApiResources(templateJson);

    expect(templateJson).toMatchSnapshot();
  });
});
