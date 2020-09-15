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
