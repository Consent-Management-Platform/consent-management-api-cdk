import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Effect, OpenIdConnectPrincipal, OpenIdConnectProvider, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { GITHUB_ORGANIZATION } from '../constants/github';
import { StageConfig } from '../interfaces/stage-config';

export interface CodePipelineStackProps extends StackProps {
  stageConfig: StageConfig;
}

/**
 * Defines infrastructure supporting automated deployment pipelines.
 */
export class CodePipelineStack extends Stack {
  constructor(scope: Construct, id: string, readonly props: CodePipelineStackProps) {
    super(scope, id, props);

    // Create GitHub OpenID Connect provider
    const oidcProvider = new OpenIdConnectProvider(this, 'GitHubOIDCProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // Create GitHub principal which will be used to assume deployment roles.
    const gitHubPrincipal = new OpenIdConnectPrincipal(oidcProvider).withConditions(
      {
        StringLike: {
          'token.actions.githubusercontent.com:sub':
            `repo:${GITHUB_ORGANIZATION}/*:*`,
        },
      }
    );

    /**
      * Create a deployment role that has short lived credentials. The only
      * principal that can assume this role is the GitHub Open ID provider.
      *
      * This role is granted authority to assume AWS CDK roles.
      */
    new Role(this, 'GitHubActionsRole', {
      assumedBy: gitHubPrincipal,
      description: 'Role assumed by GitHub Actions to deploy code/infra using aws cdk',
      roleName: 'github-ci-role',
      maxSessionDuration: Duration.hours(1),
      inlinePolicies: {
        CdkDeploymentPolicy: new PolicyDocument({
          assignSids: true,
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['sts:AssumeRole'],
              resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
            }),
          ],
        }),
      },
    });
  }
}
