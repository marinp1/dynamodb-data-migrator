import * as AWS from 'aws-sdk';

interface Configuration {
  region: string;
  profile: string;
}

const sourceConfiguration = {
  region: 'eu-central-1',
  profile: 'patrikmarin',
};

const tableName = 'ReminderSubscriptions';

const {region, profile} = sourceConfiguration;

AWS.config.update({
  region,
  credentials: new AWS.SharedIniFileCredentials({profile}),
});

(async () => {
  const client = new AWS.DynamoDB.DocumentClient();
  const {Items, Count, LastEvaluatedKey} = await client
    .scan({
      TableName: tableName,
    })
    .promise();

  console.log(Count, LastEvaluatedKey, Items);
})();
