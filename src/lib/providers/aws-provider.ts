import "server-only";
import { getEc2InstanceMetrics } from "@/lib/aws/cloudwatch";
import { getEc2Instance, listEc2Instances } from "@/lib/aws/ec2";
import { isInstanceNotFound, toProviderError } from "@/lib/aws/errors";
import type { TimeRangeKey } from "@/lib/time-ranges";
import type { Ec2Instance, InstanceMetrics } from "@/lib/types";
import type { MonitoringProvider } from "./monitoring-provider";

/**
 * AWS provider: real EC2 instances and CloudWatch metrics from your account,
 * through AWS SDK v3 on the server. Read-only: it calls only
 * DescribeInstances, DescribeInstanceStatus, GetMetricData and ListMetrics.
 *
 * Every SDK error is converted into a ProviderError with a safe message.
 */
export class AwsMonitoringProvider implements MonitoringProvider {
  readonly source = "AWS" as const;

  async listInstances(region: string): Promise<Ec2Instance[]> {
    try {
      return await listEc2Instances(region);
    } catch (error) {
      throw toProviderError(error, region);
    }
  }

  async getInstance(region: string, instanceId: string): Promise<Ec2Instance | null> {
    try {
      return await getEc2Instance(region, instanceId);
    } catch (error) {
      if (isInstanceNotFound(error)) return null;
      throw toProviderError(error, region);
    }
  }

  async getInstanceMetrics(region: string, instance: Ec2Instance, range: TimeRangeKey): Promise<InstanceMetrics> {
    try {
      return await getEc2InstanceMetrics(region, instance, range);
    } catch (error) {
      throw toProviderError(error, region);
    }
  }
}
