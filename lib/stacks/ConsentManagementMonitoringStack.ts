import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { DefaultDashboardFactory, MonitoringFacade } from 'cdk-monitoring-constructs';
import { Construct } from 'constructs';

import { StageConfig } from '../interfaces/stage-config';
import { constructApiDefinition } from '../utils/openapi';

export interface ConsentManagementMonitoringStackProps extends StackProps {
  apiLambda: Function;
  restApi: SpecRestApi;
  stageConfig: StageConfig;
}

export class ConsentManagementMonitoringStack extends Stack {
  private readonly monitoring: MonitoringFacade;

  constructor(scope: Construct, id: string, readonly props: ConsentManagementMonitoringStackProps) {
    super(scope, id, props);

    this.monitoring = this.createMonitoringFacade();
    this.createRestApiGatewayMonitoring();
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
              maxLatency: Duration.millis(50)
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
}