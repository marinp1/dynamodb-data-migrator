import DynamoDB, {Key} from 'aws-sdk/clients/dynamodb';
import {Transform} from 'stream';
import {delay} from '../utils';

export const scanTableToStream = async (
  itemStream: Transform,
  tableName: string,
  dynamoDB: DynamoDB,
  options: Partial<{
    limit: number;
    throttle: number;
  }>,
  totalCount = 0,
  startKey: Key | undefined = undefined
): Promise<void> =>
  new Promise(
    (resolve: (object: {count: number; limited: boolean}) => void, reject) =>
      dynamoDB.scan(
        {
          TableName: tableName,
          ExclusiveStartKey: startKey,
          ConsistentRead: true,
          Limit: options.limit,
        },
        async (err, {Items, Count, LastEvaluatedKey}) => {
          if (err) {
            return reject(new Error('Failed to get items from table'));
          }

          if (!Items || !Count) {
            return reject(new Error('Table did not contain any items'));
          }

          // Add fetched items to stream
          itemStream.push(Items);

          const overLimit = !!(
            options.limit && totalCount + Count >= options.limit
          );

          if (LastEvaluatedKey === undefined || overLimit) {
            return resolve({count: totalCount + Count, limited: overLimit});
          } else {
            await delay(options.throttle);
            return scanTableToStream(
              itemStream,
              tableName,
              dynamoDB,
              options,
              totalCount + Count,
              LastEvaluatedKey
            );
          }
        }
      )
  )
    .then(({count, limited}) => {
      console.debug(
        `Scanned table ${tableName} (${count} items${
          limited ? `, result limited to ${options.limit}` : ''
        })`
      );
    })
    .catch(e => {
      console.debug('Failed to scan table', tableName);
      itemStream.write(e);
    })
    .finally(() => {
      itemStream.end();
    });
