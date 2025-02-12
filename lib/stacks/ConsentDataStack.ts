import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, ProjectionType, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { CustomDynamoDbTable } from '../constructs/CustomDynamoDbTable';
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
    return new CustomDynamoDbTable(this, 'ServiceUserConsentDynamoDBTable', {
      tableName: 'ServiceUserConsent',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });
  }

  private createConsentsByServiceUserGsi(consentTable: Table) {
    consentTable.addGlobalSecondaryIndex({
      indexName: 'ConsentsByServiceUser',
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'serviceId',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });
  }
}
