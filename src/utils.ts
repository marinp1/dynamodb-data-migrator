import {IndexName, KeySchema, Projection} from 'aws-sdk/clients/dynamodb';

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

export const convertDescriptionToInput = (
  tableDescription: AWS.DynamoDB.TableDescription,
  temporaryTableName: string
): AWS.DynamoDB.CreateTableInput => {
  if (!tableDescription.AttributeDefinitions || !tableDescription.KeySchema) {
    throw new Error('No attribute definitions or key schema in table');
  }
  return {
    AttributeDefinitions: tableDescription.AttributeDefinitions,
    TableName: temporaryTableName,
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
  };
};
