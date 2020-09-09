import * as AWS from 'aws-sdk';
import config from './config';

const getLocalConfig = () => {
  return new AWS.DynamoDB({
    region: 'local',
    credentials: undefined,
    accessKeyId: 'local',
    secretAccessKey: 'local',
    endpoint: config.localConfig.localDynamoDbUrl,
  });
};

export const getDynamoDB = (type: 'source' | 'local' | 'target') => {
  if (type === 'local') {
    return getLocalConfig();
  }

  if (config[type].region === 'localhost') {
    return getLocalConfig();
  }

  return new AWS.DynamoDB({
    region: config[type].region,
    credentials: new AWS.SharedIniFileCredentials({
      profile: config[type].profile,
    }),
    accessKeyId: undefined,
    secretAccessKey: undefined,
    endpoint: undefined,
  });
};
