import DynamoDB from 'aws-sdk/clients/dynamodb';

export const deleteTable = async (
  tableName: string,
  dynamoDb: DynamoDB
): Promise<void> =>
  new Promise((resolve, reject) =>
    dynamoDb.deleteTable({TableName: tableName}, err => {
      if (err && err.code !== 'ResourceNotFoundException') {
        console.error(err);
        return reject(new Error('Temporary table deletion failed!'));
      }
      console.log('Deleted table', tableName);
      return resolve();
    })
  );
