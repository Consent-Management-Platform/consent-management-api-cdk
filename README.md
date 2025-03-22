# consent-management-api-cdk

[![Build](https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/test.yml)
[![Deploy](https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/deploy.yml)

This package defines the AWS infrastructure for the Consent Management API, using the AWS Cloud Development Kit (CDK).

## Architecture diagrams

The Consent Management API will route traffic through a Web Application Firewall (WAF) that will filter out common forms of malicious traffic to maintain service for legitimate users.

The WAF will pass legitimate traffic through to a REST API Gateway, which will provide API authentication/authorization, per-client rate-limiting, and basic request input validation before passing through to the appropriate Lambda function, which will query backend data stored in DynamoDB and emit application logs and metrics to CloudWatch.

![Consent Management API design diagram](https://github.com/Consent-Management-Platform/consent-management-design/blob/main/consent-management-api/diagrams/ConsentManagementApiDesignDiagram.png)

Consent writes will be automatically synced via DynamoDB Streams to an Consent History Ingestor Lambda Function, with an SQS dead letter queue catching any messages that the Lambda fails to process.

The Consent History Ingestor will write consent history items to a Consent History DynamoDB table, with application logs and metrics emitted to CloudWatch.

![Consent History Ingestion design diagram](https://github.com/Consent-Management-Platform/consent-management-design/blob/main/consent-management-api/diagrams/ConsentHistoryDesignDiagrams-DynamoDB%20Stream%20Option.drawio.png)

## Technologies
[AWS Cloud Development Kit (AWS CDK)](https://docs.aws.amazon.com/cdk/) is used to define AWS infrastructure in code and provision it through [AWS CloudFormation](https://aws.amazon.com/cloudformation/).

[GitHub Actions](https://docs.github.com/en/actions) are used to automatically run test builds after code changes, synthesize CloudFormation stack templates, and deploy code and infrastructure changes to AWS.

[Gradle](https://docs.gradle.org) is used to build the project and manage package dependencies.

## License
The code in this project is released under the [GPL-3.0 License](LICENSE).

## Resources
* [API design artifacts](https://github.com/Consent-Management-Platform/consent-management-design)
* [API service code](https://github.com/Consent-Management-Platform/consent-management-api)
* [API model definitions](https://github.com/Consent-Management-Platform/consent-management-api-models/)
* [API v1 documentation](https://consent-management-platform.github.io/consent-management-api-models/v1/docs.html)
