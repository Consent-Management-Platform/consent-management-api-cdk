import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { DefaultDashboardFactory, MonitoringFacade } from 'cdk-monitoring-constructs';
import { Construct } from 'constructs';

import { StageConfig } from '../interfaces/stage-config';
import { constructApiDefinition } from '../utils/openapi';

export interface ConsentManagementMonitoringStackProps extends StackProps {
  apiLambda: Function;
  consentTable: Table;
  restApi: SpecRestApi;
  stageConfig: StageConfig;
}

export class ConsentManagementMonitoringStack extends Stack {
  private readonly monitoring: MonitoringFacade;

  private static readonly THIRTY_MILLIS: Duration = Duration.millis(30);
  private static readonly FIFTY_MILLIS: Duration = Duration.millis(50);

  constructor(scope: Construct, id: string, readonly props: ConsentManagementMonitoringStackProps) {
    super(scope, id, props);

    this.monitoring = this.createMonitoringFacade();
    this.createRestApiGatewayMonitoring();
    this.createConsentDynamoDBMonitoring();
  }

  private createMonitoringFacade(): MonitoringFacade {
    return new MonitoringFacade(this, 'ConsentManagementMonitoring', {
      dashboardFactory: new DefaultDashboardFactory(this, 'ConsentManagementDashboardFactory', {
        dashboardNamePrefix: 'ConsentManagement',
        createDashboard: true,
        createSummaryDashboard: true,
        createAlarmDashboard: true
      })
    });
  }

  private createRestApiGatewayMonitoring() {
    this.monitoring.addLargeHeader('Consent Management API Gateway Metrics');

    const apiDefinition = constructApiDefinition(this.props.env!, this.props.apiLambda.functionArn);
    const apiPaths = apiDefinition.paths;
    Object.keys(apiPaths).forEach((apiPathKey) => {
      Object.keys(apiPaths[apiPathKey]).forEach((httpMethodKey: string) => {
        this.monitoring.monitorApiGateway({
          api: this.props.restApi,
          apiMethod: httpMethodKey.toUpperCase(),
          apiResource: apiPathKey,
          apiStage: this.props.stageConfig.stage,
          addToDetailDashboard: true,
          add5XXFaultCountAlarm: {
            Warning: {
              maxErrorCount: 0
            }
          },
          addLatencyP95Alarm: {
            Warning: {
              maxLatency: ConsentManagementMonitoringStack.FIFTY_MILLIS
            }
          },
          addHighTpsAlarm: {
            Warning: {
              maxTps: 100
            }
          }
        });
      });
    });
  }

  private createConsentDynamoDBMonitoring() {
    this.monitoring.addLargeHeader('Consent Management DynamoDB Metrics');
    this.monitoring.monitorDynamoTable({
      table: this.props.consentTable,
      billingMode: BillingMode.PAY_PER_REQUEST,
      addToDetailDashboard: true,
      addToSummaryDashboard: false,
      addAverageSuccessfulGetItemLatencyAlarm: {
        Warning: {
          maxLatency: ConsentManagementMonitoringStack.THIRTY_MILLIS
        }
      },
      addAverageSuccessfulQueryLatencyAlarm: {
        Warning: {
          maxLatency: ConsentManagementMonitoringStack.THIRTY_MILLIS
        }
      },
      addAverageSuccessfulPutItemLatencyAlarm: {
        Warning: {
          maxLatency: ConsentManagementMonitoringStack.THIRTY_MILLIS
        }
      },
      addAverageSuccessfulScanLatencyAlarm: {
        Warning: {
          maxLatency: ConsentManagementMonitoringStack.THIRTY_MILLIS
        }
      },
      addReadThrottledEventsCountAlarm: {
        Warning: {
          maxThrottledEventsThreshold: 0
        }
      },
      addWriteThrottledEventsCountAlarm: {
        Warning: {
          maxThrottledEventsThreshold: 0
        }
      }
    });
  }
}