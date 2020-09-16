import DynamoDB from 'aws-sdk/clients/dynamodb';

export const createTable = async (
  tableInput: DynamoDB.CreateTableInput,
  dynamoDb: DynamoDB
): Promise<void> =>
  new Promise((resolve, reject) =>
    dynamoDb.createTable(tableInput, (err, response) => {
      if (!response || !response.TableDescription || err) {
        console.error(err);
        return reject(new Error('Failed to create table'));
      }
      console.log('Created table', tableInput.TableName);
      return resolve();
    })
  );
