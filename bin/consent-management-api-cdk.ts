#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib';
import { join } from 'path';

import { StageName } from '../lib/constants/stages';
import { CodePipelineStack } from '../lib/stacks/CodePipelineStack';
import { ConsentDataStack } from '../lib/stacks/ConsentDataStack';
import { ConsentHistoryDataStack } from '../lib/stacks/ConsentHistoryDataStack';
import { ConsentManagementApiStack } from '../lib/stacks/ConsentManagementApiStack';
import { ConsentManagementMonitoringStack } from '../lib/stacks/ConsentManagementMonitoringStack';
import { ConsentHistoryProcessorStack } from '../lib/stacks/ConsentHistoryProcessorStack';
import { CONSENT_MANAGEMENT_BACKEND_SERVICE_TAG_VALUE, SERVICE_TAG_NAME, STACK_TAG_NAME } from '../lib/constants/tags';

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

// Create CD/CI infra stacks
const codePipelineStack: CodePipelineStack = new CodePipelineStack(app, 'CodePipelineStack', commonStackProps);

// Create data stacks
const consentDataStack: ConsentDataStack = new ConsentDataStack(app, 'ConsentDataStack', commonStackProps);
const consentHistoryDataStack: ConsentHistoryDataStack = new ConsentHistoryDataStack(app, 'ConsentHistoryDataStack', commonStackProps);

// Create API stacks
const consentManagementApiStack: ConsentManagementApiStack = new ConsentManagementApiStack(app, 'ConsentManagementApiStack', {
  ...commonStackProps,
  apiCodePackageFilePath: join(__dirname, '../../consent-management-api/build/distributions/consent-management-api.zip'),
  codeDeployRole: codePipelineStack.codeDeployRole,
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
const consentBackendMonitoringStack: ConsentManagementMonitoringStack = new ConsentManagementMonitoringStack(app, 'ConsentManagementMonitoringStack', {
  ...commonStackProps,
  consentManagementApiLambda: consentManagementApiStack.apiLambda,
  consentHistoryProcessorLambda: consentHistoryProcessorStack.consentHistoryProcessorLambda,
  consentTable: consentDataStack.consentTable,
  consentHistoryTable: consentHistoryDataStack.consentHistoryTable,
  restApi: consentManagementApiStack.restApi
});

// Tag all stack resources
const stacks = [
  codePipelineStack,
  consentDataStack,
  consentHistoryDataStack,
  consentManagementApiStack,
  consentHistoryProcessorStack,
  consentBackendMonitoringStack
];
stacks.forEach(stack => {
  Tags.of(stack).add(SERVICE_TAG_NAME, CONSENT_MANAGEMENT_BACKEND_SERVICE_TAG_VALUE);
  Tags.of(stack).add(STACK_TAG_NAME, stack.stackName);
});
