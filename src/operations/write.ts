import DynamoDB from 'aws-sdk/clients/dynamodb';
import lodashChunk from 'lodash.chunk';

export const writeItemsToTable = async (
  allItems: DynamoDB.ItemList,
  tableName: string,
  dynamoDB: DynamoDB
): Promise<void> =>
  Promise.all(
    // AWS Supports at most 25 items per chunk
    lodashChunk(allItems, 25).map(
      async items =>
        new Promise((resolve: () => void, reject) =>
          dynamoDB.transactWriteItems(
            {
              TransactItems: items.map(item => ({
                Put: {
                  Item: item,
                  TableName: tableName,
                },
              })),
            },
            err => {
              if (err) {
                if (err.code === 'ProvisionedThroughputExceededException') {
                  return reject(
                    new Error('ProvisionedThroughputExceededException')
                  );
                }
                console.error(err);
                return reject(new Error('Failed to copy items to table'));
              }
              return resolve();
            }
          )
        )
    )
  ).then(() => {
    console.log('Copied', allItems.length, 'items to', tableName);
  });
