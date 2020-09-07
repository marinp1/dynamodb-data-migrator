import * as AWS from 'aws-sdk';

interface Configuration {
  region: string;
  profile: string;
}

const sourceConfiguration: Configuration = {
  region: 'eu-central-1',
  profile: 'patrikmarin',
};

const targetConfiguration: Configuration = {
  region: 'eu-central-1',
  profile: 'patrikmarin',
};

const dynamoDbLocalUri = 'http://localhost:8000';

const configureAWS = (type: 'source' | 'local' | 'target') => {
  switch (type) {
    case 'source':
      return AWS.config.update({
        region: sourceConfiguration.region,
        credentials: new AWS.SharedIniFileCredentials({
          profile: sourceConfiguration.profile,
        }),
        accessKeyId: undefined,
        secretAccessKey: undefined,
      });
    case 'target':
      return AWS.config.update({
        region: targetConfiguration.region,
        credentials: new AWS.SharedIniFileCredentials({
          profile: targetConfiguration.profile,
        }),
        accessKeyId: undefined,
        secretAccessKey: undefined,
      });
    case 'local':
      return AWS.config.update({
        region: 'local',
        credentials: undefined,
        accessKeyId: 'local',
        secretAccessKey: 'local',
      });
  }
};

export const getDynamoDB = (type: 'source' | 'local' | 'target') => {
  configureAWS(type);
  return new AWS.DynamoDB({
    endpoint: type === 'local' ? dynamoDbLocalUri : undefined,
  });
};
