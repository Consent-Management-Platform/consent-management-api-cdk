import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, ProjectionType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { StageConfig } from '../interfaces/stage-config';

export interface ConsentDataStackProps extends StackProps {
  stageConfig: StageConfig;
}

/**
 * Defines the consent data storage layer.
 *
 * This stack is separated from higher-level components such as API compute services
 * to minimize the risk of other layer changes impacting the consent database,
 * which should be extremely stable and never deleted after prod launch.
 */
export class ConsentDataStack extends Stack {
  public readonly consentTable: Table;

  constructor(scope: Construct, id: string, readonly props: ConsentDataStackProps) {
    super(scope, id, props);

    this.consentTable = this.createConsentTable();
    this.createConsentsByServiceUserGsi(this.consentTable);
  }

  private createConsentTable() {
    return new Table(this, 'ServiceUserConsentDynamoDBTable', {
      tableName: 'ServiceUserConsent',
      encryption: TableEncryption.AWS_MANAGED,
      partitionKey: {
        name: 'Id',
        type: AttributeType.STRING
      },
      pointInTimeRecovery: true,
      deletionProtection: true,
      billingMode: BillingMode.PAY_PER_REQUEST
    });
  }

  private createConsentsByServiceUserGsi(consentTable: Table) {
    consentTable.addGlobalSecondaryIndex({
      indexName: 'ConsentsByServiceUser',
      partitionKey: {
        name: 'UserId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'ServiceId',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });
  }
}
