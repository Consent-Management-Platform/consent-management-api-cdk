import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime, SnapStartConf } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

import { StageConfig } from '../interfaces/stage-config';
import { CustomLambdaFunction } from '../constructs/CustomLambdaFunction';

export interface ConsentExpiryProcessorStackProps extends StackProps {
  codePackageFilePath: string;
  consentTable: Table;
  stageConfig: StageConfig;
}

/**
 * Defines infrastructure for automatically updating consents to EXPIRED when they have passed their expiry time.
 */
export class ConsentExpiryProcessorStack extends Stack {
  public readonly apiLambda: Function;

  constructor(scope: Construct, id: string, readonly props: ConsentExpiryProcessorStackProps) {
    super(scope, id, props);

    this.apiLambda = this.createApiLambdaFunction();
  }

  private createApiLambdaFunction(): Function {
    const lambdaFunction: Function = new CustomLambdaFunction(this, 'ConsentExpiryProcessorLambda', {
      code: Code.fromAsset(this.props.codePackageFilePath),
      description: 'Consent Expiry Processor Lambda',
      handler: 'com.consentframework.consentexpiryprocessor.ConsentExpiryProcessor::handleRequest',
      memorySize: 1536,
      runtime: Runtime.JAVA_21,
      snapStart: SnapStartConf.ON_PUBLISHED_VERSIONS,
      timeout: Duration.minutes(15)
    });

    // Grant permissions to query DynamoDB consent data
    lambdaFunction.addToRolePolicy(new PolicyStatement({
      sid: 'ConsentDynamoDBQueryPermissions',
      actions: [
        'dynamodb:ConditionCheckItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:UpdateItem'
      ],
      resources: [
        this.props.consentTable.tableArn,
        `${this.props.consentTable.tableArn}/index/*`
      ]
    }));

    return lambdaFunction;
  }
}
