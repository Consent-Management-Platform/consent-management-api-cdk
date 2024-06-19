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

Prerequisite set-up of API service package:
* In the parent directory that contains the consent-management-api-cdk, check out https://github.com/Consent-Management-Platform/consent-management-api
* From within the consent-management-api directory, run `./gradlew build` to build the API project.
* Validate that build/distributions/consent-management-api.zip has been created.
* Note: This is in order for the ConsentManagementApiStack to locate the API service code to upload to S3.  Pending investigation into long-term way to automatically build and consume API service code to remove this manual workaround.

Steps to build and deploy CDK stacks:

* Run `npm install` to install project dependencies.
* Run `npm run test` and validate all tests pass.
* Run `npx cdk synth` to synthesize CloudFormation templates from your local CDK code and validates succeeds.
* Run `ls cdk.out` and validate that the project's stacks have assets and template JSON files generated in this folder, eg. `ConsentDataStack.template.json`.
* Run `npx cdk bootstrap` to deploy a CDKToolkit CloudFormation stack to your account with prerequisites to deploying CDK applications, validate succeeds.
* Run `npx cdk deploy <ENTER_STACK_NAME_HERE>` to deploy a given stack to your dev account.  Examples below:
  * `npx cdk deploy ConsentDataStack`
  * `npx cdk deploy ConsentManagementApiStack`

### Updating stack snapshots

This package uses test snapshots to validate in local builds and code reviews that CDK code updates apply the expected changes to CloudFormation templates.

If you make functional changes to CDK code, builds will fail with an `N snapshot(s) failed.` message along with a diff of what the snapshot changes were.

If the changes are as you expect, run `npm test -- -u` to update the snapshots.

## Useful commands

* `npm install`     install local package dependencies
* `npm run build`   compile typescript to js
* `npm run clean`   clear generated build artifacts such as cdk.out and node_modules
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk bootstrap` deploy bootstrap stack to set up your AWS account with prerequisites for deploying your CDK stacks
* `npx cdk deploy <STACK_NAME_HERE>`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Troubleshooting

### Running `npm run build` fails with `Cannot find module` errors

You may need to run `npm install` to install this package's dependencies.

### Running `npx cdk synth` fails with `Error: accountId should be of type string` errors

You may need to:
1. Follow the "Set up environment variables" instructions earlier in this file's set-up steps
2. Ensure your new environment variables have been loaded into your terminal/IDE
