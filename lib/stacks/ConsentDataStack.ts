import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, ProjectionType, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { ACTIVE_CONSENTS_WITH_EXPIRY_TIME_GSI_NAME, CONSENTS_BY_SERVICE_USER_GSI_NAME } from '../constants/dynamodb';
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
    this.createActiveConsentsWithExpiryTimeGsi(this.consentTable);
  }

  /**
   * Create the DynamoDB table for storing consents.
   */
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

  /**
   * Create GSI for tracking consents by service user.
   *
   * This will enable efficient queries for all consents
   * associated with a specific service and user pair.
   */
  private createConsentsByServiceUserGsi(consentTable: Table) {
    consentTable.addGlobalSecondaryIndex({
      indexName: CONSENTS_BY_SERVICE_USER_GSI_NAME,
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

  /**
   * Create GSI for tracking active consents with expiry times.
   *
   * This will be used to efficiently query for active consents
   * that are past their expiry time in order to automatically
   * update their status to EXPIRED.
   */
  private createActiveConsentsWithExpiryTimeGsi(consentTable: Table) {
    consentTable.addGlobalSecondaryIndex({
      indexName: ACTIVE_CONSENTS_WITH_EXPIRY_TIME_GSI_NAME,
      partitionKey: {
        name: 'activeId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'expiryTime',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.KEYS_ONLY
    });
  }
}
