import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface CustomLambdaFunctionProps extends FunctionProps {}

/**
 * Custom Lambda function that extends the default AWS Lambda Function construct with default configurations.
 * 
 * Project configurations:
 * - Standardize AWS CloudWatch log group names and expiration policies, expiring after 18 months.
 * - Grant the Lambda function permissions to emit custom CloudWatch metrics.
 */
export class CustomLambdaFunction extends Function {
  constructor(scope: Construct, readonly id: string, readonly props: CustomLambdaFunctionProps) {
    super(scope, id, {
      ...props,
      logGroup: new LogGroup(scope, `${id}LogGroup`, {
        logGroupName: `${id}-ApplicationLogs`,
        retention: RetentionDays.EIGHTEEN_MONTHS
      })
    });
    this.grantPermissions();
  }

  private grantPermissions() {
    // Grant permissions to emit custom CloudWatch metrics
    // Already has permissions to write to CloudWatch logs by default
    this.addToRolePolicy(new PolicyStatement({
      sid: 'CloudWatchMetricsPermissions',
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));
  }
}
