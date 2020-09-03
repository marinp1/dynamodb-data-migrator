import {Config as AWSConfig} from 'aws-sdk/lib/config';
import {SharedIniFileCredentials} from 'aws-sdk/lib/credentials/shared_ini_file_credentials';

import {DocumentClient} from 'aws-sdk/clients/dynamodb';

interface Configuration {
  region: string;
  profile: string;
}

const sourceConfiguration = {
  region: 'eu-central-1',
  profile: 'patrikmarin',
};

const tableName = 'ReminderSubscriptions';

const config = new AWSConfig();

const {region, profile} = sourceConfiguration;

config.update({
  region,
  credentials: new SharedIniFileCredentials({profile}),
});

(async () => {
  const client = new DocumentClient();
  const {Items, Count, LastEvaluatedKey} = await client
    .scan({
      TableName: tableName,
    })
    .promise();

  console.log(Count, LastEvaluatedKey, Items);
})();
