import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { StageConfig } from '../interfaces/stage-config';

export interface ConsentHistoryDataStackProps extends StackProps {
  stageConfig: StageConfig;
}

/**
 * Defines the consent history data storage layer.
 */
export class ConsentHistoryDataStack extends Stack {
  public readonly consentHistoryTable: Table;

  constructor(scope: Construct, id: string, readonly props: ConsentHistoryDataStackProps) {
    super(scope, id, props);

    this.consentHistoryTable = this.createConsentHistoryTable();
  }

  private createConsentHistoryTable() {
    return new Table(this, 'ServiceUserConsentHistoryDynamoDBTable', {
      tableName: 'ConsentHistory',
      encryption: TableEncryption.AWS_MANAGED,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'eventId',
        type: AttributeType.STRING
      },
      pointInTimeRecovery: true,
      deletionProtection: true,
      billingMode: BillingMode.PAY_PER_REQUEST
    });
  }
}
