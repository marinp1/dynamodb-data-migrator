import DynamoDB from 'aws-sdk/clients/dynamodb';

export const doesTableExist = async (
  tableName: string,
  dynamoDb: DynamoDB
): Promise<boolean> =>
  new Promise(resolve =>
    dynamoDb.describeTable({TableName: tableName}, (err, response) => {
      if (err || !response.Table) {
        return resolve(false);
      }
      return resolve(true);
    })
  );
