import { Aws, CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { ApiDefinition, Deployment, EndpointType, MethodLoggingLevel, SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { AccountRootPrincipal, ArnPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime, SnapStartConf } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';

import {
  CONSENT_HISTORY_API_DOCS_URL,
  CONSENT_HISTORY_API_ENDPOINT_EXPORT_NAME,
  CONSENT_HISTORY_API_GATEWAY_ID_EXPORT_NAME,
  CONSENT_HISTORY_API_THROTTLING_BURST_LIMIT,
  CONSENT_HISTORY_API_THROTTLING_LIMIT
} from '../constants/apis';
import { StageConfig } from '../interfaces/stage-config';
import { constructApiDefinition } from '../utils/openapi';
import { CustomLambdaFunction } from '../constructs/CustomLambdaFunction';

export interface ConsentHistoryApiStackProps extends StackProps {
  apiCodePackageFilePath: string;
  codeDeployRole: Role;
  consentHistoryTable: Table;
  stageConfig: StageConfig;
}

/**
 * Defines Consent History API gateway and compute infrastructure.
 */
export class ConsentHistoryApiStack extends Stack {
  public readonly apiLambda: Function;
  public readonly restApi: SpecRestApi;

  constructor(scope: Construct, id: string, readonly props: ConsentHistoryApiStackProps) {
    super(scope, id, props);

    this.apiLambda = this.createApiLambdaFunction();
    this.restApi = this.createRestApiGateway(this.apiLambda);
    this.grantCodeDeployRolePermissions(this.restApi);

    this.createExports(this.restApi);
  }

  private createApiLambdaFunction(): Function {
    const lambdaFunction: Function = new CustomLambdaFunction(this, 'ConsentHistoryApiLambda', {
      code: Code.fromAsset(this.props.apiCodePackageFilePath),
      description: 'Consent History API Lambda',
      functionName: `ConsentHistoryApi-${this.props.stageConfig.stage}`,
      handler: 'com.consentframework.consenthistory.api.ConsentHistoryApiService::handleRequest',
      memorySize: 1536,
      runtime: Runtime.JAVA_21,
      snapStart: SnapStartConf.ON_PUBLISHED_VERSIONS,
      timeout: Duration.minutes(1)
    });

    // Grant permissions to query DynamoDB consent history data
    lambdaFunction.addToRolePolicy(new PolicyStatement({
      sid: 'ConsentHistoryDdbQueryPermissions',
      actions: [
        'dynamodb:ConditionCheckItem',
        'dynamodb:GetItem',
        'dynamodb:Query'
      ],
      resources: [
        this.props.consentHistoryTable.tableArn,
        `${this.props.consentHistoryTable.tableArn}/index/*`
      ]
    }));

    return lambdaFunction;
  }

  private createRestApiGateway(apiLambda: Function): SpecRestApi {
    const openApiSpecFilePath = join(__dirname, '../../resources/ConsentHistoryApi.openapi.json');
    const apiDefinition: object = constructApiDefinition(this.props.env!, apiLambda.functionArn, openApiSpecFilePath);
    const apiAccessPolicy = this.createApiGatewayAccessPolicy();

    const api: SpecRestApi = new SpecRestApi(this, 'Consent History API Gateway', {
      apiDefinition: ApiDefinition.fromInline(apiDefinition),
      cloudWatchRole: true,
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        stageName: this.props.stageConfig.stage,
        throttlingBurstLimit: CONSENT_HISTORY_API_THROTTLING_BURST_LIMIT,
        throttlingRateLimit: CONSENT_HISTORY_API_THROTTLING_LIMIT
      },
      description: `Consent History API, see documentation at ${CONSENT_HISTORY_API_DOCS_URL}`,
      endpointExportName: CONSENT_HISTORY_API_ENDPOINT_EXPORT_NAME,
      endpointTypes: [EndpointType.EDGE],
      policy: apiAccessPolicy,
      restApiName: 'ConsentHistoryApi'
    });

    // Trigger API Gateway deployment when there are OpenAPI spec updates to apply the changes
    const apiDeployment = new Deployment(this, 'ConsentHistoryApiDeployment', { api });
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
    const githubCiRolePrincipal = new ArnPrincipal(`arn:aws:iam::${Aws.ACCOUNT_ID}:role/github-ci-role`);

    return new PolicyDocument({
      statements: [
        new PolicyStatement({
          sid: 'ConsentHistoryApiGatewayFullInvokeAccess',
          actions: ['execute-api:Invoke'],
          effect: Effect.ALLOW,
          principals: [
            // Grant services within the same account API access
            new AccountRootPrincipal(),
            // Grant the CD/CI role API access
            githubCiRolePrincipal,
          ],
          // Grants invoke permissions to all APIs within this API Gateway
          resources: ['execute-api/*']
        }),
        new PolicyStatement({
          sid: 'ConsentHistoryApiGatewayApiAccess',
          actions: [
            'apigateway:GET',
            'apigateway:POST'
          ],
          effect: Effect.ALLOW,
          principals: [
            githubCiRolePrincipal,
          ],
          resources: [
            `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}::/restapis/*/resources`,
            `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}::/restapis/*/resources/*/*/*`,
          ]
        })
      ]
    });
  }

  private grantCodeDeployRolePermissions(restApi: SpecRestApi): void {
    // Allow to invoke Consent History API endpoints for API integ tests
    this.props.codeDeployRole.addToPrincipalPolicy(new PolicyStatement({
      sid: 'ConsentHistoryApiInvokePermissions',
      actions: ['execute-api:Invoke'],
      effect: Effect.ALLOW,
      resources: [restApi.arnForExecuteApi()],
    }));
    // Allow to invoke API endpoints via API Gateway TestInvokeApi for AWS CLI based integ tests
    this.props.codeDeployRole.addToPrincipalPolicy(new PolicyStatement({
      sid: 'ConsentHistoryApiTestInvokeMethodPermissions',
      actions: [
        'apigateway:GET',
        'apigateway:POST'
      ],
      effect: Effect.ALLOW,
      resources: [
        `arn:aws:apigateway:us-west-2::/restapis/${restApi.restApiId}/resources`,
        `arn:aws:apigateway:us-west-2::/restapis/${restApi.restApiId}/resources/*/*/*`
      ],
    }));

    // Allow to generate API clients from API Gateway endpoint
    // These encapsulate the logic for making authenticated queries, building requests, and parsing API responses
    this.props.codeDeployRole.addToPrincipalPolicy(new PolicyStatement({
      sid: 'ConsentHistoryApiGetSdkPermissions',
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
    new CfnOutput(this, 'ConsentHistoryApiGatewayIdExport', {
      exportName: CONSENT_HISTORY_API_GATEWAY_ID_EXPORT_NAME,
      value: restApi.restApiId
    });
  }
}
