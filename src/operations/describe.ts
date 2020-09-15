import DynamoDB from 'aws-sdk/clients/dynamodb';

export const describeTable = async (
  tableName: string,
  dynamoDb: DynamoDB
): Promise<AWS.DynamoDB.TableDescription> =>
  new Promise((resolve, reject) =>
    dynamoDb.describeTable({TableName: tableName}, (err, response) => {
      if (err) {
        console.error(err);
        return reject(new Error('Failed to describe table'));
      }
      if (!response.Table) {
        console.info(response);
        return reject(new Error('Failed to get description for table!'));
      }
      console.log('Fetched description for table', tableName);
      return resolve(response.Table);
    })
  );
