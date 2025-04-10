import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, ProjectionType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
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
    this.createServiceUserGsi(this.consentHistoryTable);
  }

  /**
   * Creates the ConsentHistory DynamoDB table.
   *
   * Every ConsentHistory record is associated with an id partition key + eventId
   * sort key pair, where id is constructed from "{serviceId}|{userId}|{consentId}",
   * and eventId is a unique identifier for a given consent change event.
   *
   * Table queries must specify the partition key, while the sort key is optional.
   * Querying the table with id = "{serviceId}|{userId}|{consentId}", without specifying
   * eventId, will return all ConsentHistory records for the given consent.
   */
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

  /**
   * Creates a ConsentHistoryByServiceUser index on the consent history table.
   *
   * This DynamoDB Global Secondary Index (GSI) allows querying for the history of
   * all consents associated with a serviceId + userId pair.
   *
   * Each GSI partition key + sort key pair must be unique in the table, while there can
   * be multiple items with the same partition key.  Every GSI query must specify the
   * partition key, while including the sort key in the query request is optional.
   *
   * By querying the ConsentHistoryByServiceUser GSI with serviceUserId =
   * "{serviceId}|{userId}", without specifying eventId, we can retrieve all
   * ConsentHistory records for the given serviceId + userId pair.
   */
  private createServiceUserGsi(consentHistoryTable: Table) {
    consentHistoryTable.addGlobalSecondaryIndex({
      indexName: 'ConsentHistoryByServiceUser',
      partitionKey: {
        name: 'serviceUserId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'eventId',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });
  }
}
