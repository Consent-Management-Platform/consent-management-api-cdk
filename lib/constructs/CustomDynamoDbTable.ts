import { BillingMode, Table, TableEncryption, TableProps } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface CustomDynamoDbTableProps extends TableProps {}

const DEFAULT_PROPS: Partial<TableProps> = {
  encryption: TableEncryption.AWS_MANAGED,
  pointInTimeRecoverySpecification: {
    pointInTimeRecoveryEnabled: true
  },
  deletionProtection: true,
  billingMode: BillingMode.PAY_PER_REQUEST,
};

export class CustomDynamoDbTable extends Table {
  constructor(scope: Construct, readonly id: string, readonly props: CustomDynamoDbTableProps) {
    super(scope, id, {
      ...DEFAULT_PROPS,
      ...props,
    });
  }
}
