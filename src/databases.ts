import * as AWS from 'aws-sdk';
import {Config} from './types';

const getLocalConfig = (config: Config) => {
  return new AWS.DynamoDB({
    region: 'local',
    credentials: undefined,
    accessKeyId: 'local',
    secretAccessKey: 'local',
    endpoint: config.localConfig.endpoint,
  });
};

export const getDynamoDB = (
  type: 'source' | 'local' | 'target',
  config: Config
) => {
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
