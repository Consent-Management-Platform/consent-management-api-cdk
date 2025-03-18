import { Aws, CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { ApiDefinition, Deployment, EndpointType, MethodLoggingLevel, SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { AccountRootPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime, SnapStartConf } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

import {
  CONSENT_MANAGEMENT_API_DOCS_URL,
  CONSENT_MANAGEMENT_API_ENDPOINT_EXPORT_NAME,
  CONSENT_MANAGEMENT_API_GATEWAY_ID_EXPORT_NAME,
  CONSENT_MANAGEMENT_API_THROTTLING_BURST_LIMIT,
  CONSENT_MANAGEMENT_API_THROTTLING_LIMIT
} from '../constants/apis';
import { StageConfig } from '../interfaces/stage-config';
import { constructApiDefinition } from '../utils/openapi';
import { CustomLambdaFunction } from '../constructs/CustomLambdaFunction';

export interface ConsentManagementApiStackProps extends StackProps {
  apiCodePackageFilePath: string;
  codeDeployRole: Role;
  consentTable: Table;
  stageConfig: StageConfig;
}

/**
 * Defines Consent Management API gateway and compute infrastructure.
 */
export class ConsentManagementApiStack extends Stack {
  public readonly apiLambda: Function;
  public readonly restApi: SpecRestApi;

  constructor(scope: Construct, id: string, readonly props: ConsentManagementApiStackProps) {
    super(scope, id, props);

    this.apiLambda = this.createApiLambdaFunction();
    this.restApi = this.createRestApiGateway(this.apiLambda);
    this.grantCodeDeployRolePermissions(this.restApi);

    this.createExports(this.restApi);
  }

  private createApiLambdaFunction(): Function {
    const lambdaFunction: Function = new CustomLambdaFunction(this, 'ConsentManagementApiLambda', {
      code: Code.fromAsset(this.props.apiCodePackageFilePath),
      description: 'Consent Management API Lambda',
      handler: 'com.consentframework.consentmanagement.api.ConsentManagementApiService::handleRequest',
      memorySize: 1536,
      runtime: Runtime.JAVA_21,
      snapStart: SnapStartConf.ON_PUBLISHED_VERSIONS,
      timeout: Duration.minutes(1)
    });

    // Grant permissions to query DynamoDB consent data
    lambdaFunction.addToRolePolicy(new PolicyStatement({
      sid: 'ConsentDynamoDBQueryPermissions',
      actions: [
        'dynamodb:ConditionCheckItem',
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:Query'
      ],
      resources: [
        this.props.consentTable.tableArn,
        `${this.props.consentTable.tableArn}/index/*`
      ]
    }));

    return lambdaFunction;
  }

  private createRestApiGateway(apiLambda: Function): SpecRestApi {
    const apiDefinition: object = constructApiDefinition(this.props.env!, apiLambda.functionArn);
    const apiAccessPolicy = this.createApiGatewayAccessPolicy();

    const api: SpecRestApi = new SpecRestApi(this, 'Consent Management API Gateway', {
      apiDefinition: ApiDefinition.fromInline(apiDefinition),
      cloudWatchRole: true,
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        stageName: this.props.stageConfig.stage,
        throttlingBurstLimit: CONSENT_MANAGEMENT_API_THROTTLING_BURST_LIMIT,
        throttlingRateLimit: CONSENT_MANAGEMENT_API_THROTTLING_LIMIT
      },
      description: `Consent Management API, see documentation at ${CONSENT_MANAGEMENT_API_DOCS_URL}`,
      endpointExportName: CONSENT_MANAGEMENT_API_ENDPOINT_EXPORT_NAME,
      endpointTypes: [EndpointType.EDGE],
      policy: apiAccessPolicy,
      restApiName: 'ConsentManagementApi'
    });

    // Trigger API Gateway deployment when there are OpenAPI spec updates to apply the changes
    const apiDeployment = new Deployment(this, 'ConsentManagementApiDeployment', { api });
    apiDeployment.addToLogicalId(apiDefinition);

    apiLambda.grantInvoke(new ServicePrincipal('apigateway.amazonaws.com').withConditions({
      ArnLike: { 'aws:SourceArn': api.arnForExecuteApi() }
    }));

    return api;
  }

  /**
   * Explicitly set which principals are allowed to access which API methods.
   * Anyone not explicitly granted permissions will be denied API access.
   *
   * Ref: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-authorization-flow.html
   */
  private createApiGatewayAccessPolicy(): PolicyDocument {
    return new PolicyDocument({
      statements: [new PolicyStatement({
        sid: 'ConsentManagementApiGatewaySameAccountFullInvokeAccess',
        actions: ['execute-api:Invoke'],
        effect: Effect.ALLOW,
        // Grant services within the same account API access
        principals: [new AccountRootPrincipal()],
        // Grants invoke permissions to all APIs within this API Gateway
        resources: ['execute-api/*']
      })]
    });
  }

  private grantCodeDeployRolePermissions(restApi: SpecRestApi): void {
    // Allow to invoke Consent Management API endpoints for API integ tests
    this.props.codeDeployRole.addToPrincipalPolicy(new PolicyStatement({
      sid: 'ConsentManagementApiInvokePermissions',
      actions: ['execute-api:Invoke'],
      effect: Effect.ALLOW,
      resources: [restApi.arnForExecuteApi()],
    }));

    // Allow to generate API clients from API Gateway endpoint
    // These encapsulate the logic for making authenticated queries, building requests, and parsing API responses
    this.props.codeDeployRole.addToPrincipalPolicy(new PolicyStatement({
      sid: 'ConsentManagementApiGetSdkPermissions',
      actions: ['apigateway:GET'],
      effect: Effect.ALLOW,
      resources: [`arn:${Aws.PARTITION}:apigateway:${Aws.REGION}::/restapis/${restApi.restApiId}/stages/*/sdks/*`],
    }));

    // Allow to list CDK exports to retrieve API Gateway ID
    this.props.codeDeployRole.addToPrincipalPolicy(new PolicyStatement({
      sid: 'CloudFormationListExportsPermissions',
      actions: ['cloudformation:ListExports'],
      effect: Effect.ALLOW,
      resources: ['*'], // CloudFormation exports are global, cannot filter permissions
    }));
  }

  private createExports(restApi: SpecRestApi): void {
    new CfnOutput(this, 'ConsentManagementApiGatewayIdExport', {
      exportName: CONSENT_MANAGEMENT_API_GATEWAY_ID_EXPORT_NAME,
      value: restApi.restApiId
    });
  }
}
