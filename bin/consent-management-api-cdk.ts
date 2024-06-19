#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';

import { StageName } from '../lib/constants/stages';
import { ConsentDataStack } from '../lib/stacks/ConsentDataStack';
import { ConsentManagementApiStack } from '../lib/stacks/ConsentManagementApiStack';
import { join } from 'path';

const app = new App();
const commonStackProps = {
  env: {
    account: process.env.CONSENT_DEV_ACCOUNT_ID,
    region: process.env.CONSENT_DEV_REGION
  },
  stageConfig: {
    stage: StageName.DEV
  }
};

new ConsentDataStack(app, 'ConsentDataStack', commonStackProps);
new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
  ...commonStackProps,
  apiCodePackageFilePath: join(__dirname, '../../consent-management-api/build/distributions/consent-management-api.zip')
});
