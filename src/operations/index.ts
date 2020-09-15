import DynamoDB from 'aws-sdk/clients/dynamodb';
import {Transform} from 'stream';

import {createTable} from './create';
import {deleteTable} from './delete';
import {describeTable} from './describe';
import {writeItemsToTable} from './write';
import {scanTableToStream} from './scan';

import * as AWS from 'aws-sdk';
import {Config, RegionType} from '../types';

const getLocalConfig = (config: Config) => {
  return new AWS.DynamoDB({
    region: 'local',
    credentials: undefined,
    accessKeyId: 'local',
    secretAccessKey: 'local',
    endpoint: config.localConfig.endpoint,
  });
};

const getDynamoDB = (type: RegionType, config: Config) => {
  if (type === 'local') {
    return getLocalConfig(config);
  }

  const regionConfig = config[type];

  if (!regionConfig) {
    throw new Error('Configuration not given');
  }

  if (regionConfig.region === 'localhost') {
    return getLocalConfig(config);
  }

  return new AWS.DynamoDB({
    region: regionConfig.region,
    credentials: new AWS.SharedIniFileCredentials({
      profile: regionConfig.profile,
    }),
    accessKeyId: undefined,
    secretAccessKey: undefined,
    endpoint: undefined,
  });
};

export const getTableOperations = (config: Config) => (region: RegionType) => ({
  create: (tableInput: DynamoDB.CreateTableInput) =>
    createTable(tableInput, getDynamoDB(region, config)),
  delete: (tableName: string) =>
    deleteTable(tableName, getDynamoDB(region, config)),
  describe: (tableName: string) =>
    describeTable(tableName, getDynamoDB(region, config)),
  write: (items: DynamoDB.ItemList, tableName: string) =>
    writeItemsToTable(items, tableName, getDynamoDB(region, config)),
  scanToStream: (
    streamToPopulate: Transform,
    tableName: string,
    options: Partial<{limit: number; throttle: number}>
  ) =>
    scanTableToStream(
      streamToPopulate,
      tableName,
      getDynamoDB(region, config),
      options
    ),
});

export default (config: Config) =>
  Promise.resolve({
    local: getTableOperations(config)('local'),
    target: getTableOperations(config)('target'),
    source: getTableOperations(config)('source'),
  });
