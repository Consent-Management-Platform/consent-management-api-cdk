import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { ApiDefinition, EndpointType, MethodLoggingLevel, SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { AccountRootPrincipal, Effect, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  CONSENT_MANAGEMENT_API_DOCS_URL,
  CONSENT_MANAGEMENT_API_ENDPOINT_EXPORT_NAME,
  CONSENT_MANAGEMENT_API_THROTTLING_BURST_LIMIT,
  CONSENT_MANAGEMENT_API_THROTTLING_LIMIT
} from '../constants/apis';
import { StageConfig } from '../interfaces/stage-config';

export interface ConsentManagementApiStackProps extends StackProps {
  apiCodePackageFilePath: string;
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
    return new Function(this, 'Consent Management API Lambda', {
      code: Code.fromAsset(this.props.apiCodePackageFilePath),
      description: 'Consent Management API Lambda',
      handler: 'com.consentframework.consentmanagement.api.ConsentManagementApiService::handleRequest',
      memorySize: 512,
      runtime: Runtime.JAVA_21,
      timeout: Duration.minutes(1)
    });
  }

  private createRestApiGateway(apiLambda: Function): SpecRestApi {
    const apiDefinition = this.constructApiDefinition(apiLambda);
    const apiAccessPolicy = this.createApiGatewayAccessPolicy();

    const api: SpecRestApi = new SpecRestApi(this, 'Consent Management API Gateway', {
      apiDefinition: ApiDefinition.fromInline(apiDefinition),
      cloudWatchRole: true,
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        stageName: 'dev',
        throttlingBurstLimit: CONSENT_MANAGEMENT_API_THROTTLING_BURST_LIMIT,
        throttlingRateLimit: CONSENT_MANAGEMENT_API_THROTTLING_LIMIT
      },
      description: `Consent Management API, see documentation at ${CONSENT_MANAGEMENT_API_DOCS_URL}`,
      endpointExportName: CONSENT_MANAGEMENT_API_ENDPOINT_EXPORT_NAME,
      endpointTypes: [EndpointType.EDGE],
      policy: apiAccessPolicy,
      restApiName: 'ConsentManagementApi'
    });

    apiLambda.grantInvoke(new ServicePrincipal('apigateway.amazonaws.com').withConditions({
      ArnLike: { 'aws:SourceArn': api.arnForExecuteApi() }
    }));

    return api;
  }

  private constructApiDefinition(apiLambda: Function) {
    const openApiSpecFilePath = join(__dirname, '../../resources/ConsentManagementApi.openapi.json');
    const apiDefinition = JSON.parse(readFileSync(openApiSpecFilePath, 'utf8'));

    // Add API Gateway integration to OpenAPI spec
    for (const path in apiDefinition.paths) {
      for (const operation in apiDefinition.paths[path]) {
        apiDefinition.paths[path][operation]['x-amazon-apigateway-integration'] = {
          type: 'aws_proxy',
          httpMethod: 'POST',
          passthroughBehavior: 'when_no_match',
          responses: {
            default: {
              statusCode: '200',
            },
          },
          uri: `arn:aws:apigateway:${this.props.env!.region}:lambda:path/2015-03-31/functions/${apiLambda.functionArn}/invocations`
        }
      }
    }

    return apiDefinition;
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
