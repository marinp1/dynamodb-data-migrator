import * as AWS from 'aws-sdk';

import {IndexName, KeySchema, Projection} from 'aws-sdk/clients/dynamodb';

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

const tableName = 'ReminderSubscriptions';

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

type RequiredIndexType = {
  IndexName: IndexName;
  KeySchema: KeySchema;
  Projection: Projection;
};

const parseIndexResponse = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  indexes: undefined | Array<Partial<RequiredIndexType> & {[x: string]: any}>
): RequiredIndexType[] | undefined => {
  return indexes
    ? indexes.map(({IndexName, KeySchema, Projection}) => {
        if (!IndexName || !KeySchema || !Projection) {
          throw new Error('Index invalid!');
        }
        return {
          IndexName,
          KeySchema,
          Projection,
        };
      })
    : undefined;
};

(async () => {
  // 1. DescribeTable
  configureAWS('source');
  const sourceClient = new AWS.DynamoDB();

  const {
    Table: tableDescription,
    $response: descriptionResponse,
  } = await sourceClient
    .describeTable({
      TableName: tableName,
    })
    .promise();

  if (!tableDescription) {
    console.info(descriptionResponse.data);
    if (descriptionResponse.error) {
      console.error(descriptionResponse.error);
    }
    return;
  }

  if (!tableDescription.AttributeDefinitions || !tableDescription.KeySchema) {
    console.error('No attribute definitions for table!');
    return;
  }

  configureAWS('local');
  const localClient = new AWS.DynamoDB({
    endpoint: 'http://localhost:8000',
  });

  const {
    TableDescription: createdTableDescription,
    $response: createResponse,
  } = await localClient
    .createTable({
      AttributeDefinitions: tableDescription.AttributeDefinitions,
      TableName: 'dynamodb-migrator-temporary-table',
      KeySchema: tableDescription.KeySchema,
      LocalSecondaryIndexes: parseIndexResponse(
        tableDescription.LocalSecondaryIndexes
      ),
      GlobalSecondaryIndexes: parseIndexResponse(
        tableDescription.GlobalSecondaryIndexes
      ),
      ProvisionedThroughput: {
        ReadCapacityUnits: 40000,
        WriteCapacityUnits: 40000,
      },
    })
    .promise();

  if (!createdTableDescription) {
    console.info(createResponse.data);
    if (createResponse.error) {
      console.error(createResponse.error);
    }
    return;
  }

  console.log('Table created with name', createdTableDescription.TableName);
  /*
  const {Items, Count, LastEvaluatedKey} = await client
    .scan({
      TableName: tableName,
    })
    .promise();

  console.log(Count, LastEvaluatedKey, Items);
  configureAWS('local');
  */
})();
