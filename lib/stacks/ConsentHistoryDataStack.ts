import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { CustomDynamoDbTable } from '../constructs/CustomDynamoDbTable';
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
    return new CustomDynamoDbTable(this, 'ServiceUserConsentHistoryDynamoDBTable', {
      tableName: 'ConsentHistory',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'eventId',
        type: AttributeType.STRING
      },
    });
  }
}
