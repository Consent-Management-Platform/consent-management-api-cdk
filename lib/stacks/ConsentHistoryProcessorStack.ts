import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Function, Runtime, SnapStartConf, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

import { StageConfig } from '../interfaces/stage-config';
import { CustomLambdaFunction } from '../constructs/CustomLambdaFunction';

export interface ConsentHistoryProcessorStackProps extends StackProps {
  codePackageFilePath: string;
  consentTable: Table;
  consentHistoryTable: Table;
  stageConfig: StageConfig;
}

/**
 * Defines the infrastructure for syncing consent updates to the consent history table.
 */
export class ConsentHistoryProcessorStack extends Stack {
  constructor(scope: Construct, id: string, readonly props: ConsentHistoryProcessorStackProps) {
    super(scope, id, props);
    this.createConsentHistoryProcessorLambda();
  }

  private createConsentHistoryProcessorLambda() {
    const lambdaFunction: Function = new CustomLambdaFunction(this, 'ConsentHistoryProcessorLambda', {
      code: Code.fromAsset(this.props.codePackageFilePath),
      description: 'Consent History Processor Lambda',
      environment: {
        CONSENT_HISTORY_TABLE_NAME: this.props.consentHistoryTable.tableName,
        STAGE: this.props.stageConfig.stage
      },
      handler: 'com.consentframework.consenthistory.consentingestor.ConsentStreamIngestor::handleRequest',
      memorySize: 1024,
      runtime: Runtime.JAVA_21,
      snapStart: SnapStartConf.ON_PUBLISHED_VERSIONS,
      timeout: Duration.minutes(1)
    });

    // Add consent table's DynamoDB Stream as an event source for the Lambda function
    this.props.consentTable.grantStreamRead(lambdaFunction);
    lambdaFunction.addEventSource(new DynamoEventSource(this.props.consentTable, {
      startingPosition: StartingPosition.TRIM_HORIZON
    }));

    // Grant the Lambda function permissions to write to the consent history table
    this.props.consentHistoryTable.grantWriteData(lambdaFunction);
  }
}
