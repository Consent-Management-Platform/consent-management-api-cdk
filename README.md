# consent-management-api-cdk

[![Build](https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/test.yml)
[![Last Deployment](https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/Consent-Management-Platform/consent-management-api-cdk/actions/workflows/deploy.yml)

This package defines the AWS infrastructure for the Consent Management API, using the AWS Cloud Development Kit (CDK).

## API architecture diagram

The Consent Management API will route traffic through a Web Application Firewall (WAF) that will filter out common forms of malicious traffic to maintain service for legitimate users.

The WAF will pass legitimate traffic through to a REST API Gateway, which will provide API authentication/authorization, per-client rate-limiting, and basic request input validation before passing through to the appropriate Lambda function, which will query backend data stored in DynamoDB and emit application logs and metrics to CloudWatch.

![Consent Management API design diagram](https://github.com/Consent-Management-Platform/consent-management-design/blob/main/consent-management-api/diagrams/ConsentManagementApiDesignDiagram.png)

## Technologies
[AWS Cloud Development Kit (AWS CDK)](https://docs.aws.amazon.com/cdk/) is used to define AWS infrastructure in code and provision it through [AWS CloudFormation](https://aws.amazon.com/cloudformation/).

## License
The code in this project is released under the [GPL-3.0 License](LICENSE).

## Resources
* [API design artifacts](https://github.com/Consent-Management-Platform/consent-management-design)
* [API service code](https://github.com/Consent-Management-Platform/consent-management-api)
* [API model definitions](https://github.com/Consent-Management-Platform/consent-management-api-models/)
* [API v1 documentation](https://consent-management-platform.github.io/consent-management-api-models/v1/docs.html)
