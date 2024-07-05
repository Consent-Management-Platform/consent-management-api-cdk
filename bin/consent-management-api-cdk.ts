#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { join } from 'path';

import { StageName } from '../lib/constants/stages';
import { ConsentDataStack } from '../lib/stacks/ConsentDataStack';
import { ConsentHistoryDataStack } from '../lib/stacks/ConsentHistoryDataStack';
import { ConsentManagementApiStack } from '../lib/stacks/ConsentManagementApiStack';
import { ConsentManagementMonitoringStack } from '../lib/stacks/ConsentManagementMonitoringStack';

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

// Create data stacks
const consentDataStack: ConsentDataStack = new ConsentDataStack(app, 'ConsentDataStack', commonStackProps);
const consentHistoryDataStack: ConsentHistoryDataStack = new ConsentHistoryDataStack(app, 'ConsentHistoryDataStack', commonStackProps);

// Create API stacks
const consentManagementApiStack: ConsentManagementApiStack = new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
  ...commonStackProps,
  apiCodePackageFilePath: join(__dirname, '../../consent-management-api/build/distributions/consent-management-api.zip'),
  consentTable: consentDataStack.consentTable
});

// Create monitoring stacks
new ConsentManagementMonitoringStack(app, 'ConsentManagementMonitoringStack', {
  ...commonStackProps,
  apiLambda: consentManagementApiStack.apiLambda,
  consentTable: consentDataStack.consentTable,
  consentHistoryTable: consentHistoryDataStack.consentHistoryTable,
  restApi: consentManagementApiStack.restApi
});
