## Developer set-up

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

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
