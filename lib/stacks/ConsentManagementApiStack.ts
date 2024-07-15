import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { ApiDefinition, Deployment, EndpointType, MethodLoggingLevel, SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { AccountRootPrincipal, Effect, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime, SnapStartConf } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import {
  CONSENT_MANAGEMENT_API_DOCS_URL,
  CONSENT_MANAGEMENT_API_ENDPOINT_EXPORT_NAME,
  CONSENT_MANAGEMENT_API_THROTTLING_BURST_LIMIT,
  CONSENT_MANAGEMENT_API_THROTTLING_LIMIT
} from '../constants/apis';
import { StageConfig } from '../interfaces/stage-config';
import { constructApiDefinition } from '../utils/openapi';

export interface ConsentManagementApiStackProps extends StackProps {
  apiCodePackageFilePath: string;
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
  }

  private createApiLambdaFunction(): Function {
    const lambdaLogGroup: LogGroup = new LogGroup(this, 'ConsentManagementApiLambdaLogGroup', {
      logGroupName: 'ConsentManagementApi-Lambda-ApplicationLogs',
      retention: RetentionDays.EIGHTEEN_MONTHS
    });
    const lambdaFunction: Function = new Function(this, 'Consent Management API Lambda', {
      code: Code.fromAsset(this.props.apiCodePackageFilePath),
      description: 'Consent Management API Lambda',
      handler: 'com.consentframework.consentmanagement.api.ConsentManagementApiService::handleRequest',
      logGroup: lambdaLogGroup,
      memorySize: 1536,
      runtime: Runtime.JAVA_21,
      snapStart: SnapStartConf.ON_PUBLISHED_VERSIONS,
      timeout: Duration.minutes(1)
    });

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

    return lambdaFunction
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
}
