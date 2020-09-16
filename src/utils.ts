import {IndexName, KeySchema, Projection} from 'aws-sdk/clients/dynamodb';

type RequiredIndexType = {
  IndexName: IndexName;
  KeySchema: KeySchema;
  Projection: Projection;
};

export const delay = async (ms: number | undefined) =>
  new Promise(resolve =>
    ms && ms > 0 ? setTimeout(() => resolve(), ms) : resolve()
  );

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
                  ReadCapacityUnits: ProvisionedThroughput.ReadCapacityUnits,
                  WriteCapacityUnits: ProvisionedThroughput.WriteCapacityUnits,
                },
              }
            : index;
        }
      )
    : undefined;
};

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

  const billingMode = ((tableDescription.BillingModeSummary &&
    tableDescription.BillingModeSummary.BillingMode) ||
    undefined) as 'PROVISIONED' | 'PAY_PER_REQUEST' | undefined;

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
    BillingMode: billingMode,
    ProvisionedThroughput:
      billingMode !== 'PAY_PER_REQUEST'
        ? {
            ReadCapacityUnits:
              tableDescription.ProvisionedThroughput?.ReadCapacityUnits || 1,
            WriteCapacityUnits:
              tableDescription.ProvisionedThroughput?.WriteCapacityUnits || 1,
          }
        : undefined,
  };
};
