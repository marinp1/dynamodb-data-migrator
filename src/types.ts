import {getTableOperations} from './operations';

export interface AWSConfig {
  profile: string;
  region: string;
  tableName: string;
}

export interface Config {
  source: AWSConfig;
  target: AWSConfig | null;
  localConfig: {
    sourceTableName: string;
    targetTableName: string;
    endpoint: string;
  };
}

export type RegionType = 'source' | 'target' | 'local';

export type Operations = ReturnType<typeof getTableOperations>;

export interface InitialiseArguments {
  'source-profile': string;
  'source-region': string;
  'source-table': string;
  'target-profile': string;
  'target-region': string;
  'target-table': string | undefined;
  'local-dynamodb-endpoint': string;
  'local-source-tablename': string;
  'local-target-tablename': string;
  'use-source-schema': boolean;
}

export interface FetchArguments {
  'config-file': string;
  'dry-run': boolean;
  truncate: boolean;
  limit: number;
  throttle: number;
}

export interface TransformArguments {
  'config-file': string;
  // 'transform-file': string;
  'dry-run': boolean;
  truncate: boolean;
}

interface MigrationArguments {
  'config-file': string;
  'dry-run': boolean;
  'create-table': boolean;
  throttle: number;
}
