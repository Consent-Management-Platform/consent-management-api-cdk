#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { join } from 'path';

import { StageName } from '../lib/constants/stages';
import { ConsentDataStack } from '../lib/stacks/ConsentDataStack';
import { ConsentHistoryDataStack } from '../lib/stacks/ConsentHistoryDataStack';
import { ConsentManagementApiStack } from '../lib/stacks/ConsentManagementApiStack';
import { ConsentManagementMonitoringStack } from '../lib/stacks/ConsentManagementMonitoringStack';
import { ConsentHistoryProcessorStack } from '../lib/stacks/ConsentHistoryProcessorStack';

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

// Create consent history processor stack
const consentHistoryProcessorStack: ConsentHistoryProcessorStack = new ConsentHistoryProcessorStack(app, 'ConsentHistoryProcessorStack', {
  ...commonStackProps,
  codePackageFilePath: join(__dirname, '../../consent-history-ingestor/build/distributions/consent-history-ingestor.zip'),
  consentTable: consentDataStack.consentTable,
  consentHistoryTable: consentHistoryDataStack.consentHistoryTable
});

// Create monitoring stacks
new ConsentManagementMonitoringStack(app, 'ConsentManagementMonitoringStack', {
  ...commonStackProps,
  consentManagementApiLambda: consentManagementApiStack.apiLambda,
  consentHistoryProcessorLambda: consentHistoryProcessorStack.consentHistoryProcessorLambda,
  consentTable: consentDataStack.consentTable,
  consentHistoryTable: consentHistoryDataStack.consentHistoryTable,
  restApi: consentManagementApiStack.restApi
});
