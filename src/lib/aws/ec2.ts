import "server-only";
import {
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand,
  type DescribeInstancesCommandInput,
  type DescribeInstanceStatusCommandInput,
  type Instance,
  type InstanceStatus,
} from "@aws-sdk/client-ec2";
import { INSTANCE_STATES, type Ec2Instance, type InstanceState, type StatusCheck } from "@/lib/types";
import { callOptions, getAwsClients } from "./client";

/**
 * Read-only EC2 calls. Only two APIs are used:
 *   ec2:DescribeInstances       instance list and details
 *   ec2:DescribeInstanceStatus  system / instance status checks
 */

/** Safety net against an endless NextToken loop (1000 instances per page). */
const MAX_PAGES = 50;

async function describeInstances(region: string, input: DescribeInstancesCommandInput): Promise<Instance[]> {
  const { ec2 } = getAwsClients(region);
  const instances: Instance[] = [];
  let nextToken: string | undefined;
  let pages = 0;

  do {
    const response = await ec2.send(
      new DescribeInstancesCommand({
        ...input,
        NextToken: nextToken,
        // MaxResults can't be combined with InstanceIds.
        ...(input.InstanceIds ? {} : { MaxResults: 1000 }),
      }),
      callOptions(),
    );
    for (const reservation of response.Reservations ?? []) instances.push(...(reservation.Instances ?? []));
    nextToken = response.NextToken;
    pages++;
  } while (nextToken && pages < MAX_PAGES);

  return instances;
}

async function describeStatuses(
  region: string,
  input: DescribeInstanceStatusCommandInput,
): Promise<Map<string, InstanceStatus>> {
  const { ec2 } = getAwsClients(region);
  const statuses = new Map<string, InstanceStatus>();
  let nextToken: string | undefined;
  let pages = 0;

  do {
    const response = await ec2.send(
      new DescribeInstanceStatusCommand({
        ...input,
        // Without this, AWS only returns running instances.
        IncludeAllInstances: true,
        NextToken: nextToken,
        ...(input.InstanceIds ? {} : { MaxResults: 1000 }),
      }),
      callOptions(),
    );
    for (const status of response.InstanceStatuses ?? []) {
      if (status.InstanceId) statuses.set(status.InstanceId, status);
    }
    nextToken = response.NextToken;
    pages++;
  } while (nextToken && pages < MAX_PAGES);

  return statuses;
}

function toState(name: string | undefined): InstanceState {
  return INSTANCE_STATES.includes(name as InstanceState) ? (name as InstanceState) : "pending";
}

function toStatusCheck(value: string | undefined, state: InstanceState): StatusCheck {
  if (state !== "running" && state !== "pending") return "not-applicable";
  switch (value) {
    case "ok":
    case "impaired":
    case "initializing":
    case "insufficient-data":
    case "not-applicable":
      return value;
    default:
      return "insufficient-data";
  }
}

/** Maps the raw SDK object to the dashboard's own shape. Nothing else leaves the server. */
function toEc2Instance(instance: Instance, region: string, status: InstanceStatus | undefined): Ec2Instance {
  const state = toState(instance.State?.Name);
  const tags: Record<string, string> = {};
  for (const tag of instance.Tags ?? []) {
    if (tag.Key) tags[tag.Key] = tag.Value ?? "";
  }

  return {
    source: "AWS",
    instanceId: instance.InstanceId ?? "unknown",
    name: tags.Name?.trim() || null,
    instanceType: instance.InstanceType ?? "unknown",
    region,
    availabilityZone: instance.Placement?.AvailabilityZone ?? null,
    state,
    publicIp: instance.PublicIpAddress ?? null,
    privateIp: instance.PrivateIpAddress ?? null,
    launchTime: instance.LaunchTime ? instance.LaunchTime.toISOString() : null,
    platform: instance.PlatformDetails ?? (instance.Platform === "Windows" ? "Windows" : "Linux/UNIX"),
    architecture: instance.Architecture ?? null,
    vpcId: instance.VpcId ?? null,
    subnetId: instance.SubnetId ?? null,
    imageId: instance.ImageId ?? null,
    keyName: instance.KeyName ?? null,
    monitoring: instance.Monitoring?.State === "enabled" ? "detailed" : "basic",
    systemStatus: toStatusCheck(status?.SystemStatus?.Status, state),
    instanceStatus: toStatusCheck(status?.InstanceStatus?.Status, state),
    tags,
  };
}

/** Every instance in the region (all pages), with status checks. */
export async function listEc2Instances(region: string): Promise<Ec2Instance[]> {
  const [instances, statuses] = await Promise.all([
    describeInstances(region, {}),
    describeStatuses(region, {}),
  ]);
  return instances
    .filter((i) => i.InstanceId)
    .map((i) => toEc2Instance(i, region, statuses.get(i.InstanceId!)));
}

/** One instance by ID. Throws InvalidInstanceID.NotFound if it doesn't exist (see isInstanceNotFound). */
export async function getEc2Instance(region: string, instanceId: string): Promise<Ec2Instance | null> {
  const [instances, statuses] = await Promise.all([
    describeInstances(region, { InstanceIds: [instanceId] }),
    describeStatuses(region, { InstanceIds: [instanceId] }),
  ]);
  const found = instances.find((i) => i.InstanceId === instanceId);
  return found ? toEc2Instance(found, region, statuses.get(instanceId)) : null;
}
