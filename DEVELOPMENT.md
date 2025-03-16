## Developer set-up

### Install dev tools

Set up Node and npm:
* [Install Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/)
* Run `node --version` and verify you are running Node 20 or later
* Run `npm --version` and verify you are running npm 10 or later
* Run `npm -g install typescript` to install TypeScript

Set up CDK CLI:
* Run `npm -g install aws-cdk` to install the CDK CLI
* Run `cdk --version` to validate the CDK CLI has been successfully installed

Set up AWS CLI:
* Follow [the AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) to install the AWS CLI
* Run `aws --version` and verify you are running a version 2 release of the CLI

### Set up environment variables

Set up the following environment variables:
* `CONSENT_DEV_ACCOUNT_ID` - set to your developer AWS account ID, eg. `"123456789012"`
* `CONSENT_DEV_REGION` - set to the AWS region you want to deploy stacks to in your dev account

Run `aws configure` and configure the AWS CLI with your dev account user's access key and secret access key to enable CDK deployments.

### First-time npm project set-up and deployment

Prerequisite set-up of service code packages:
* In the parent directory that contains the consent-management-api-cdk, check out https://github.com/Consent-Management-Platform/consent-management-api
* From within the consent-management-api directory, run `./gradlew build` to build the API project.
* Validate that build/distributions/consent-management-api.zip has been created.
* In the parent directory that contains the consent-management-api-cdk, check out https://github.com/Consent-Management-Platform/consent-history-ingestor
* From within the consent-history-ingestor directory, run `./gradlew build` to build the project.
* Validate that build/distributions/consent-history-ingestor.zip has been created.

Note: The above steps are to enable the CDK stacks to locate the service code to upload to S3.  Pending investigation into long-term way to automatically build and consume API service code to remove this manual workaround.

Steps to build and deploy CDK stacks:

* Run `npm install` to install project dependencies.
* Run `npm test` and validate all tests pass.
* Run `npx cdk synth` to synthesize CloudFormation templates from your local CDK code and validates succeeds.
* Run `ls cdk.out` and validate that the project's stacks have assets and template JSON files generated in this folder, eg. `ConsentDataStack.template.json`.
* Run `npx cdk bootstrap` to deploy a CDKToolkit CloudFormation stack to your account with prerequisites to deploying CDK applications, validate succeeds.
* Run `npx cdk deploy <ENTER_STACK_NAME_HERE>` to deploy a given stack to your dev account.  Examples below:
  * `npx cdk deploy CodePipelineStack`
  * `npx cdk deploy ConsentDataStack`
  * `npx cdk deploy ConsentHistoryDataStack`
  * `npx cdk deploy ConsentHistoryProcessorStack`
  * `npx cdk deploy ConsentManagementApiStack`
  * `npx cdk deploy ConsentManagementMonitoringStack`

### Updating stack snapshots

This package uses test snapshots to validate in local builds and code reviews that CDK code updates apply the expected changes to CloudFormation templates.

If you make functional changes to CDK code, builds will fail with an `N snapshot(s) failed.` message along with a diff of what the snapshot changes were.

If the changes are as you expect, run `npm run update-snapshots` to update the snapshots.

### Building and deploying CDK stacks via GitHub UI

Prerequisite: Follow the earlier set-up steps to CDK bootstrap and deploy the CodePipelineStack stack to your AWS account manually at least once.

Then the following steps can be used to deploy any remote branch's CDK stacks to your AWS account from the GitHub UI:

1. Navigate to https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/deploy.yml
2. Click the 'Run workflow' dropdown on the right side of the page
3. Select the code branch to use, and your AWS account ID
4. Click the 'Run workflow' button
5. Refresh the page after a few seconds and click into the new workflow run to track its progress

## Useful commands

* `npm install`     install local package dependencies
* `npm run build`   compile typescript to js
* `npm run clean`   clear generated build artifacts such as cdk.out and node_modules
* `npm run update-snapshots` compile to js and update template snapshots
* `npm run watch`   watch for changes and compile
* `npm test`        compile to js and run jest unit tests
* `npx cdk bootstrap` deploy bootstrap stack to set up your AWS account with prerequisites for deploying your CDK stacks
* `npx cdk deploy <STACK_NAME_HERE>` deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   writes synthesized CloudFormation templates to cdk.out/

## Troubleshooting

### Running `npm run build` fails with `Cannot find module` errors

You may need to run `npm install` to install this package's dependencies.

### Running `npx cdk synth` fails with `Error: accountId should be of type string` errors

You may need to:
1. Follow the "Set up environment variables" instructions earlier in this file's set-up steps
2. Ensure your new environment variables have been loaded into your terminal/IDE

### The stack named ConsentManagementApiStack failed to deploy with error `Unable to put integration on ...: Invalid ARN specified in the request`

Open the locally generated cdk.out/ConsentManagementApiStack.template.json file and check the `x-amazon-apigateway-integration` > `uri` values.

If the uri values contain `arn:aws:apigateway:undefined`, then the AWS region is not being correctly loaded from environment variables.

1. Follow the "Set up environment variables" instructions earlier in this file's set-up steps
2. Ensure your new environment variables have been loaded into your terminal/IDE
3. Rerun `npx cdk synth` and verify the API Gateway ARNs are updated to include actual AWS regions, eg. us-west-2
4. Redeploy the CDK stack
