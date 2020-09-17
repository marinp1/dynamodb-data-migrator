import DynamoDB from 'aws-sdk/clients/dynamodb';
import lodashChunk from 'lodash.chunk';
import {delay} from '../utils';

export const writeItemsToTable = async (
  allItems: DynamoDB.ItemList,
  tableName: string,
  options: Partial<{
    throttle: number;
  }>,
  dynamoDB: DynamoDB
): Promise<DynamoDB.ItemList> => {
  const writePromises = lodashChunk(allItems, 25).map(
    // AWS Supports at most 25 items per chunk
    async (items, ind) =>
      new Promise(
        (resolveWrite: (items: DynamoDB.ItemList) => void, rejectWrite) => {
          return delay((options.throttle || 0) * ind).then(() => {
            return dynamoDB.transactWriteItems(
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
                  return rejectWrite(err.code);
                }
                console.debug(
                  'Inserted items',
                  ind * 25 + 1,
                  ' - ',
                  ind * 25 + items.length
                );
                return resolveWrite(items);
              }
            );
          });
        }
      )
  );

  console.log('Divided items to write into', writePromises.length, 'chunks');
  console.log(
    `Throttling each write call with ${options.throttle || 0} milliseconds`
  );

  return new Promise((resolve, reject) => {
    return Promise.all(writePromises)
      .then(result =>
        resolve(
          result.reduce<DynamoDB.ItemList>(
            (prev, cur) => prev.concat(...cur),
            []
          )
        )
      )
      .catch(e => {
        console.error(e);
        return reject(new Error(e.message));
      });
  });
};
