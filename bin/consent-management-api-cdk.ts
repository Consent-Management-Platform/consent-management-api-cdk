#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';

import { ConsentDataStack } from '../lib/stacks/ConsentDataStack';
import { StageName } from '../lib/constants/stages';

const app = new App();
new ConsentDataStack(app, 'ConsentDataStack', {
  env: { account: process.env.CONSENT_DEV_ACCOUNT_ID, region: process.env.CONSENT_DEV_REGION },
  stageConfig: {
    stage: StageName.DEV
  }
});
