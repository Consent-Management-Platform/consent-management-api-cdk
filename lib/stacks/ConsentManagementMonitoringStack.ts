import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { DefaultDashboardFactory, MonitoringFacade } from 'cdk-monitoring-constructs';
import { Construct } from 'constructs';
import { join } from 'path';

import {
  ACTIVE_CONSENTS_BY_EXPIRY_HOUR_GSI_NAME,
  CONSENTS_BY_SERVICE_USER_GSI_NAME,
  CONSENT_HISTORY_BY_SERVICE_USER_GSI_NAME,
} from '../constants/dynamodb';
import {
  CONSENT_EXPIRY_JOB_EXPIRED_CONSENT_METRIC_NAME,
  CONSENT_EXPIRY_JOB_FAILURE_METRIC_NAME,
  CONSENT_EXPIRY_PROCESSOR_METRIC_NAMESPACE,
} from '../constants/metrics';
import { StageConfig } from '../interfaces/stage-config';
import { constructApiDefinition } from '../utils/openapi';
import { ComparisonOperator, Metric, Stats, TreatMissingData, Unit } from 'aws-cdk-lib/aws-cloudwatch';

interface LambdaAlarmConfig {
  maxRunningTasks?: number;
  maxP90Duration?: Duration;
}

export interface ConsentManagementMonitoringStackProps extends StackProps {
  consentManagementApiLambda: Function;
  consentHistoryApiLambda: Function;
  consentHistoryProcessorLambda: Function;
  consentExpiryProcessorLambda: Function;
  consentTable: Table;
  consentHistoryTable: Table;
  consentManagementRestApi: SpecRestApi;
  consentHistoryRestApi: SpecRestApi;
  stageConfig: StageConfig;
}

/**
 * Set up monitoring alarms and dashboards for the Consent Management service.
 *
 * See https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html
 * for AWS alarm recommendations.
 */
export class ConsentManagementMonitoringStack extends Stack {
  private readonly monitoring: MonitoringFacade;

  private static readonly THIRTY_MILLIS: Duration = Duration.millis(30);
  private static readonly FIFTY_MILLIS: Duration = Duration.millis(50);

  constructor(scope: Construct, id: string, readonly props: ConsentManagementMonitoringStackProps) {
    super(scope, id, props);

    this.monitoring = this.createMonitoringFacade();
    this.createConsentManagementApiGatewayMonitoring();
    this.createConsentHistoryApiGatewayMonitoring();
    this.createLambdaFunctionMonitoring(this.props.consentManagementApiLambda, 'Consent Management API Lambda Metrics', 'ConsentManagementApiLambda');
    this.createLambdaFunctionMonitoring(this.props.consentHistoryApiLambda, 'Consent History API Lambda Metrics', 'ConsentHistoryApiLambda');
    this.createLambdaFunctionMonitoring(this.props.consentHistoryProcessorLambda, 'Consent History Processor Lambda Metrics', 'ConsentHistoryProcessorLambda');
    this.createConsentExpiryProcessorLambdaMonitoring();
    this.createDynamoDbMonitoring(this.props.consentTable, 'Consent Management DynamoDB Metrics');
    this.createDynamoDbGsiMonitoring(this.props.consentTable, CONSENTS_BY_SERVICE_USER_GSI_NAME);
    this.createDynamoDbGsiMonitoring(this.props.consentTable, ACTIVE_CONSENTS_BY_EXPIRY_HOUR_GSI_NAME);
    this.createDynamoDbMonitoring(this.props.consentHistoryTable, 'Consent History DynamoDB Metrics');
    this.createDynamoDbGsiMonitoring(this.props.consentHistoryTable, CONSENT_HISTORY_BY_SERVICE_USER_GSI_NAME);
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

  private createConsentManagementApiGatewayMonitoring() {
    const openApiSpecFilePath = join(__dirname, '../../resources/ConsentManagementApi.openapi.json');

    this.createRestApiGatewayMonitoring('Consent Management API', openApiSpecFilePath,
        this.props.consentManagementApiLambda, this.props.consentManagementRestApi);
  }

  private createConsentHistoryApiGatewayMonitoring() {
    const openApiSpecFilePath = join(__dirname, '../../resources/ConsentHistoryApi.openapi.json');

    this.createRestApiGatewayMonitoring('Consent History API', openApiSpecFilePath,
        this.props.consentHistoryApiLambda, this.props.consentHistoryRestApi);
  }

  private createRestApiGatewayMonitoring(apiName: string, openApiSpecFilePath: string, apiLambdaFunction: Function, restApi: SpecRestApi) {
    this.monitoring.addLargeHeader(`${apiName} Gateway Metrics`);

    const apiDefinition = constructApiDefinition(this.props.env!, apiLambdaFunction.functionArn, openApiSpecFilePath);
    const apiPaths = apiDefinition.paths;
    Object.keys(apiPaths).forEach((apiPathKey) => {
      Object.keys(apiPaths[apiPathKey]).forEach((httpMethodKey: string) => {
        this.monitoring.monitorApiGateway({
          api: restApi,
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

  private createConsentExpiryProcessorLambdaMonitoring() {
    this.createLambdaFunctionMonitoring(this.props.consentExpiryProcessorLambda, 'Consent Expiry Processor Lambda Metrics', 'ConsentExpiryProcessorLambda', {
      // Should run at most a single instance of the consent expiry processor
      maxRunningTasks: 1,
      // Alarm when consent expiry job approaches 15-minute max Lambda runtime
      maxP90Duration: Duration.minutes(13)
    });
    this.monitoring.monitorCustom({
      addToDetailDashboard: true,
      addToSummaryDashboard: false,
      addToAlarmDashboard: true,
      alarmFriendlyName: 'ConsentExpiryProcessor',
      metricGroups: [
        {
          title: 'Consent Expiry Processor Job Runs',
          metrics: [{
            // Alarm when no successful run in the last 2 hours.
            alarmFriendlyName: 'NoRecentCompletion',
            addAlarm: {
              Warning: {
                threshold: 1,
                comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
                datapointsToAlarm: 2,
                evaluationPeriods: 2,
                period: Duration.hours(1),
                treatMissingDataOverride: TreatMissingData.BREACHING
              }
            },
            metric: new Metric({
              namespace: CONSENT_EXPIRY_PROCESSOR_METRIC_NAMESPACE,
              metricName: CONSENT_EXPIRY_JOB_FAILURE_METRIC_NAME,
              period: Duration.hours(1),
              statistic: Stats.SAMPLE_COUNT,
              label: 'ConsentExpiryJobCompletion',
              unit: Unit.COUNT,
            }),
          }]
        }
      ]
    });
    this.monitoring.monitorCustom({
      addToDetailDashboard: true,
      addToSummaryDashboard: true,
      addToAlarmDashboard: false,
      alarmFriendlyName: 'ConsentsExpired',
      metricGroups: [{
        title: 'Consent Expiries',
        metrics: [
          new Metric({
            namespace: CONSENT_EXPIRY_PROCESSOR_METRIC_NAMESPACE,
            metricName: CONSENT_EXPIRY_JOB_EXPIRED_CONSENT_METRIC_NAME,
            period: Duration.hours(1),
            statistic: Stats.SUM,
            label: 'Successful Expiries',
            unit: Unit.COUNT,
          })
        ]
      }]
    });
  }

  private createLambdaFunctionMonitoring(lambdaFunction: Function, headerContent: string, alarmPrefix: string, lambdaAlarmConfig?: LambdaAlarmConfig) {
    this.monitoring.addLargeHeader(headerContent);
    this.monitoring.monitorLambdaFunction({
      lambdaFunction,
      addToDetailDashboard: true,
      addToSummaryDashboard: false,
      alarmFriendlyName: alarmPrefix,
      fillTpsWithZeroes: true,
      lambdaInsightsEnabled: true,
      addConcurrentExecutionsCountAlarm: {
        Warning: {
          // Lambda begins throttling requests at 1k concurrent executions,
          // so we want to notify ourselves if we start approaching that threshold
          // so that we can request a quota increase through AWS Support.
          maxRunningTasks: lambdaAlarmConfig?.maxRunningTasks || 800
        }
      },
      addEnhancedMonitoringAvgMemoryUtilizationAlarm: {
        Warning: {
          maxUsagePercent: 90
        }
      },
      addFaultCountAlarm: {
        Warning: {
          maxErrorCount: 0
        }
      },
      addLatencyP90Alarm: {
        Warning: {
          maxLatency: lambdaAlarmConfig?.maxP90Duration || ConsentManagementMonitoringStack.FIFTY_MILLIS
        }
      },
      addThrottlesCountAlarm: {
        Warning: {
          maxErrorCount: 0
        }
      }
    });
  }

  private createDynamoDbMonitoring(table: Table, headerContent: string) {
    this.monitoring.addLargeHeader(headerContent);
    this.monitoring.monitorDynamoTable({
      table,
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

  private createDynamoDbGsiMonitoring(table: Table, gsiName: string) {
    this.monitoring.monitorDynamoTableGlobalSecondaryIndex({
      table,
      globalSecondaryIndexName: gsiName,
      addToDetailDashboard: true,
      addToSummaryDashboard: false,
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
