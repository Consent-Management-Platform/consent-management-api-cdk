import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, ProjectionType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { AccountPrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
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
  private readonly consentEncryptionKey: Key;
  private readonly consentTable: Table;

  constructor(scope: Construct, id: string, readonly props: ConsentDataStackProps) {
    super(scope, id, props);

    this.consentEncryptionKey = this.createConsentEncryptionKey();
    this.consentTable = this.createConsentTable(this.consentEncryptionKey);
    this.createConsentsByServiceUserGsi(this.consentTable);
  }

  private createConsentEncryptionKey(): Key {
    const tableKmsKey = new Key(this, 'ConsentEncryptionKey', {
      alias: 'ConsentTableEncryptionKey',
      enableKeyRotation: true
    });
    tableKmsKey.grantEncryptDecrypt(new AccountPrincipal(this.props.env!.account));
    return tableKmsKey;
  }

  private createConsentTable(kmsKey: Key) {
    return new Table(this, 'ServiceUserConsentDynamoDBTable', {
      tableName: 'ServiceUserConsent',
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: kmsKey,
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