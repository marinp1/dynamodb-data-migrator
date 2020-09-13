import {IndexName, KeySchema, Projection} from 'aws-sdk/clients/dynamodb';

type RequiredIndexType = {
  IndexName: IndexName;
  KeySchema: KeySchema;
  Projection: Projection;
};

// FIXME: Use correct ProvisionedThroughput
const parseIndexResponse = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  indexes: undefined | Array<Partial<RequiredIndexType> & {[x: string]: any}>
): RequiredIndexType[] | undefined => {
  return indexes
    ? indexes.map(
        ({IndexName, KeySchema, Projection, ProvisionedThroughput}) => {
          if (!IndexName || !KeySchema || !Projection) {
            throw new Error('Index invalid!');
          }

          const index = {
            IndexName,
            KeySchema,
            Projection,
          };

          return ProvisionedThroughput
            ? {
                ...index,
                ProvisionedThroughput: {
                  ReadCapacityUnits: 1000,
                  WriteCapacityUnits: 1000,
                },
              }
            : index;
        }
      )
    : undefined;
};

// FIXME: Use correct ProvisionedThroughput
export const convertDescriptionToInput = <
  T extends AWS.DynamoDB.TableDescription | null
>(
  tableDescription: T,
  temporaryTableName: string
): AWS.DynamoDB.CreateTableInput | null => {
  if (tableDescription === null) return null;
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
      ReadCapacityUnits: 20000,
      WriteCapacityUnits: 20000,
    },
  };
};
